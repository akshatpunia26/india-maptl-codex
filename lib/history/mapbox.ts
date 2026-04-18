import "server-only";

import { randomUUID } from "node:crypto";

import { placeCandidateSchema } from "@/lib/history/schemas";
import { NormalizedPlaceCandidate } from "@/lib/history/types";

const MAPBOX_SEARCH_BASE = "https://api.mapbox.com/search/searchbox/v1";

function getServerMapboxToken() {
  return process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
}

function buildDisplayContext(feature: SearchBoxFeature) {
  const context = feature.properties.context ?? {};
  const pieces = [
    context.locality?.name,
    context.place?.name,
    context.district?.name,
    context.region?.name,
    context.country?.name,
  ].filter(Boolean);

  return pieces.join(", ") || feature.properties.place_formatted || feature.properties.full_address;
}

function canonicalLabel(feature: SearchBoxFeature) {
  const preferred = feature.properties.name_preferred || feature.properties.name;
  const placeFormatted = feature.properties.place_formatted;
  return [preferred, placeFormatted].filter(Boolean).join(", ");
}

function normalizeFeature(feature: SearchBoxFeature): NormalizedPlaceCandidate {
  return placeCandidateSchema.parse({
    label: feature.properties.full_address || feature.properties.name,
    canonicalLabel: canonicalLabel(feature),
    center: [feature.properties.coordinates.longitude, feature.properties.coordinates.latitude],
    bbox: feature.properties.bbox,
    placeType: feature.properties.feature_type,
    mapboxId: feature.properties.mapbox_id,
    displayContext: buildDisplayContext(feature),
  });
}

function rankCandidate(query: string, candidate: NormalizedPlaceCandidate) {
  const normalizedQuery = query.trim().toLowerCase();
  const label = candidate.label.toLowerCase();
  const canonical = candidate.canonicalLabel.toLowerCase();
  const typeBoost =
    candidate.placeType === "place"
      ? 1
      : candidate.placeType === "district"
        ? 0.9
        : candidate.placeType === "locality"
          ? 0.85
          : candidate.placeType === "neighborhood"
            ? 0.7
            : 0.5;

  const exactBoost =
    canonical === normalizedQuery || label === normalizedQuery
      ? 1
      : canonical.startsWith(normalizedQuery) || label.startsWith(normalizedQuery)
        ? 0.92
        : canonical.includes(normalizedQuery) || label.includes(normalizedQuery)
          ? 0.82
          : 0.4;

  return typeBoost * exactBoost;
}

async function mapboxFetch<T>(url: string): Promise<T> {
  const token = getServerMapboxToken();
  if (!token) {
    throw new Error("Missing Mapbox token");
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Mapbox request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function resolvePlaceCandidates(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const token = getServerMapboxToken();
  if (!token) {
    throw new Error("Missing Mapbox token");
  }

  const sessionToken = randomUUID();
  const suggestUrl =
    `${MAPBOX_SEARCH_BASE}/suggest?q=${encodeURIComponent(trimmed)}` +
    `&session_token=${sessionToken}&limit=5&language=en&country=IN` +
    `&types=place,locality,district,neighborhood&access_token=${token}`;

  const suggestResponse = await mapboxFetch<SearchBoxSuggestResponse>(suggestUrl);
  const retrieveRequests = suggestResponse.suggestions
    .slice(0, 5)
    .map(async (suggestion) => {
      const retrieveUrl =
        `${MAPBOX_SEARCH_BASE}/retrieve/${suggestion.mapbox_id}` +
        `?session_token=${sessionToken}&access_token=${token}`;
      const retrieveResponse = await mapboxFetch<SearchBoxRetrieveResponse>(retrieveUrl);
      return retrieveResponse.features[0] ?? null;
    });

  const retrieved = (await Promise.all(retrieveRequests)).filter((feature): feature is SearchBoxFeature => Boolean(feature));
  const normalized = retrieved.map(normalizeFeature);

  return normalized
    .sort((left, right) => rankCandidate(trimmed, right) - rankCandidate(trimmed, left))
    .slice(0, 5);
}

export async function enrichCoordinatesFromSearchBox(title: string, place: NormalizedPlaceCandidate) {
  const token = getServerMapboxToken();
  if (!token) {
    return null;
  }

  const bbox = place.bbox?.join(",");
  const proximity = `${place.center[0]},${place.center[1]}`;
  const url =
    `${MAPBOX_SEARCH_BASE}/forward?q=${encodeURIComponent(`${title} ${place.canonicalLabel}`)}` +
    `&language=en&country=IN&limit=1&proximity=${proximity}` +
    `${bbox ? `&bbox=${bbox}` : ""}` +
    `&access_token=${token}`;

  const response = await mapboxFetch<SearchBoxRetrieveResponse>(url);
  const feature = response.features[0];
  if (!feature) {
    return null;
  }

  return {
    lng: feature.properties.coordinates.longitude,
    lat: feature.properties.coordinates.latitude,
  };
}

/**
 * If we later need permanent geocoding-backed canonical storage, keep it isolated here rather
 * than mixing it into the interactive Search Box flow.
 */
export async function normalizeStoredPlaceCandidate(candidate: NormalizedPlaceCandidate) {
  return candidate;
}

interface SearchBoxSuggestResponse {
  suggestions: Array<{
    name: string;
    mapbox_id: string;
    feature_type: string;
    place_formatted: string;
  }>;
}

interface SearchBoxFeature {
  geometry: {
    coordinates: [number, number];
    type: "Point";
  };
  properties: {
    name: string;
    name_preferred?: string;
    mapbox_id: string;
    feature_type: string;
    full_address: string;
    place_formatted: string;
    context?: {
      locality?: { name: string };
      place?: { name: string };
      district?: { name: string };
      region?: { name: string };
      country?: { name: string };
    };
    coordinates: {
      latitude: number;
      longitude: number;
    };
    bbox?: [number, number, number, number];
  };
}

interface SearchBoxRetrieveResponse {
  type: "FeatureCollection";
  features: SearchBoxFeature[];
}
