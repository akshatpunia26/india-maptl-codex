import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { readCache, writeCache } from "@/lib/history/cache";
import { selectCommonsImage } from "@/lib/history/images";
import { buildLensScoreMaps, computeLensEligibility } from "@/lib/history/lenses";
import { enrichCoordinatesFromSearchBox, normalizeStoredPlaceCandidate } from "@/lib/history/mapbox";
import { indiaWebSearchTool, openai, openaiModel } from "@/lib/history/openai";
import { dossierExtractionSchema } from "@/lib/history/schemas";
import { ERA_LENS_META, INTERPRETATION_LENS_META } from "@/lib/history/taxonomy";
import { CandidateSite, CityDossier, NormalizedPlaceCandidate } from "@/lib/history/types";
import { average, cacheKeyFor, clamp, radiusFromBbox } from "@/lib/history/utils";
import {
  getWikidataEntity,
  readAliases,
  readCoordinateClaim,
  readImageClaim,
  readWikipediaTitle,
  searchWikidataEntity,
} from "@/lib/history/wikidata";

const DOSSIER_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function dossierKey(place: NormalizedPlaceCandidate) {
  return cacheKeyFor("dossier", place.mapboxId, place.canonicalLabel);
}

function shouldRebuildCachedDossier(dossier: CityDossier) {
  if (dossier.candidateSites.length > 0) {
    return false;
  }

  return dossier.warnings.some(
    (warning) =>
      warning.includes("Zod field at") ||
      warning.includes("OpenAI is not configured") ||
      warning.includes("could not gather enough evidence"),
  );
}

function sourceQualityScore(value: "high" | "medium" | "low") {
  switch (value) {
    case "high":
      return 1;
    case "medium":
      return 0.74;
    case "low":
    default:
      return 0.52;
  }
}

function standingWeight(status: "standing" | "partial" | "trace" | "lost-supporting") {
  switch (status) {
    case "standing":
      return 1;
    case "partial":
      return 0.84;
    case "trace":
      return 0.63;
    case "lost-supporting":
    default:
      return 0.2;
  }
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

function isCoordinatePlausibleForPlace(
  coords: {
    lat: number;
    lng: number;
  } | null,
  place: NormalizedPlaceCandidate,
) {
  if (!coords) {
    return false;
  }

  const radiusKm = radiusFromBbox(place.bbox);
  const maxDistanceKm = Math.max(40, radiusKm * 3.5);
  return distanceKm(place.center, [coords.lng, coords.lat]) <= maxDistanceKm;
}

async function extractDossierSeed(place: NormalizedPlaceCandidate) {
  if (!openai) {
    return {
      coverageConfidence: 0.15,
      warnings: [
        "OpenAI is not configured, so the city dossier could not be researched yet.",
      ],
      sourceEvidence: [],
      candidateSites: [],
    };
  }

  const response = await openai.responses.parse({
    model: openaiModel,
    store: false,
    tools: [indiaWebSearchTool],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Build a city dossier for a standing-history app focused on India. Use web search. Only include monuments, sites, or urban traces that still exist physically today, plus optional lost-supporting references only when they corroborate a stronger standing layer. Prioritize ASI, UNESCO, official museum/government pages, Wikidata, Wikimedia, and other high-signal encyclopedic sources. Never invent coordinates or images. Use only the fixed era taxonomy and fixed interpretation taxonomy provided by the user. Return concise structured data only.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              place,
              eras: ERA_LENS_META,
              interpretationLenses: INTERPRETATION_LENS_META,
              outputRules: {
                maxCandidateSites: 12,
                minimumEvidencePerSite: 1,
                preferStandingSites: true,
              },
            }),
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(dossierExtractionSchema, "city_dossier_extraction"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error("No dossier extraction result");
  }

  return parsed;
}

async function enrichSite(
  rawSite: Awaited<ReturnType<typeof extractDossierSeed>>["candidateSites"][number],
  place: NormalizedPlaceCandidate,
): Promise<CandidateSite | null> {
  const searchedEntity =
    rawSite.wikidataId ??
    (await searchWikidataEntity(`${rawSite.title} ${place.canonicalLabel}`))?.id ??
    null;
  const entity = searchedEntity ? await getWikidataEntity(searchedEntity) : null;
  const wikidataCoords = readCoordinateClaim(entity);
  const searchCoords = !wikidataCoords
    ? await enrichCoordinatesFromSearchBox(rawSite.title, place)
    : null;
  const preferredWikidataCoords = isCoordinatePlausibleForPlace(wikidataCoords, place)
    ? wikidataCoords
    : null;
  const fallbackSearchCoords =
    searchCoords ?? (!preferredWikidataCoords ? await enrichCoordinatesFromSearchBox(rawSite.title, place) : null);
  const preferredSearchCoords = isCoordinatePlausibleForPlace(fallbackSearchCoords, place)
    ? fallbackSearchCoords
    : null;
  const coords = preferredWikidataCoords ?? preferredSearchCoords;

  if (!coords) {
    return null;
  }

  const image = await selectCommonsImage(readImageClaim(entity));
  const coordConfidence = preferredWikidataCoords ? 0.95 : preferredSearchCoords ? 0.76 : 0.4;
  const sourceQuality = sourceQualityScore(rawSite.sourceQuality);
  const distance = distanceKm(place.center, [coords.lng, coords.lat]);
  const radiusKm = radiusFromBbox(place.bbox);
  const routeFitScore = clamp(1 - distance / Math.max(radiusKm * 2.3, 8), 0.2, 1);
  const chronologyScore = clamp(
    rawSite.eraLabels.length === 1
      ? 0.95
      : rawSite.eraEnd - rawSite.eraStart <= 350
        ? 0.82
        : 0.68,
    0,
    1,
  );
  const imageScore = image ? image.imageConfidence : 0.2;
  const mappableScore = clamp(average([coordConfidence, standingWeight(rawSite.standingStatus)]), 0, 1);
  const storyworthyScore = clamp(
    average([
      sourceQuality,
      standingWeight(rawSite.standingStatus),
      rawSite.evidenceUrls.length >= 2 ? 0.88 : 0.68,
      image ? 0.86 : 0.5,
    ]),
    0,
    1,
  );

  return {
    id: cacheKeyFor(place.mapboxId, rawSite.title),
    title: rawSite.title,
    altNames: dedupeStrings([...rawSite.altNames, ...readAliases(entity)]),
    shortLabel: rawSite.shortLabel,
    lat: coords.lat,
    lng: coords.lng,
    coordSource: preferredWikidataCoords ? "wikidata" : "mapbox-search",
    coordConfidence: Number(coordConfidence.toFixed(2)),
    standingStatus: rawSite.standingStatus,
    siteType: rawSite.siteType,
    areaLabel: rawSite.areaLabel,
    eraStart: rawSite.eraStart,
    eraEnd: rawSite.eraEnd,
    eraLabels: rawSite.eraLabels,
    interpretationTags: rawSite.interpretationTags,
    visitEstimateMin: rawSite.visitEstimateMin,
    historicalSummary: rawSite.historicalSummary,
    whyItMatters: rawSite.whyItMatters,
    evidenceUrls: rawSite.evidenceUrls,
    sourceQuality: Number(sourceQuality.toFixed(2)),
    image,
    storyworthyScore: Number(storyworthyScore.toFixed(2)),
    mappableScore: Number(mappableScore.toFixed(2)),
    imageScore: Number(imageScore.toFixed(2)),
    chronologyScore: Number(chronologyScore.toFixed(2)),
    routeFitScore: Number(routeFitScore.toFixed(2)),
    wikidataId: searchedEntity ?? undefined,
    wikipediaTitle: rawSite.wikipediaTitle ?? readWikipediaTitle(entity) ?? undefined,
  };
}

export async function buildCityDossier(placeInput: NormalizedPlaceCandidate) {
  const place = await normalizeStoredPlaceCandidate(placeInput);
  const key = dossierKey(place);
  const cached = await readCache<CityDossier>("dossiers", key, DOSSIER_CACHE_TTL_MS);
  if (cached && !shouldRebuildCachedDossier(cached)) {
    return {
      dossier: cached,
      fromCache: true,
    };
  }

  let extracted: Awaited<ReturnType<typeof extractDossierSeed>>;
  let didFallbackFromError = false;

  try {
    extracted = await extractDossierSeed(place);
  } catch (error) {
    didFallbackFromError = true;
    extracted = {
      coverageConfidence: 0.2,
      warnings: [
        error instanceof Error
          ? error.message
          : "We could not gather enough evidence for this place yet.",
        "We found limited standing-history coverage for this place. Try a broader city name or switch to a theme route.",
      ],
      sourceEvidence: [],
      candidateSites: [],
    };
  }

  const enrichedSites = (
    await Promise.all(extracted.candidateSites.map((site) => enrichSite(site, place)))
  ).filter((site): site is NonNullable<Awaited<ReturnType<typeof enrichSite>>> => Boolean(site));

  const { eraScores, interpretationScores } = buildLensScoreMaps(enrichedSites);
  const imageCandidates = enrichedSites
    .filter((site) => Boolean(site.image))
    .map((site) => ({
      siteId: site.id,
      image: site.image!,
    }));

  const standingSites = enrichedSites.filter((site) => site.standingStatus !== "lost-supporting");
  const computedCoverage = clamp(
    average([
      extracted.coverageConfidence,
      standingSites.length >= 6 ? 0.95 : standingSites.length >= 4 ? 0.74 : standingSites.length >= 2 ? 0.5 : 0.2,
      average(standingSites.map((site) => site.storyworthyScore)),
    ]),
    0,
    1,
  );

  const dossier: CityDossier = {
    key,
    builtAt: new Date().toISOString(),
    place,
    coverageConfidence: Number(computedCoverage.toFixed(2)),
    candidateSites: enrichedSites,
    sourceEvidence: extracted.sourceEvidence,
    eligibleEraScores: eraScores,
    eligibleInterpretationLensScores: interpretationScores,
    imageCandidates,
    warnings: dedupeStrings([
      ...extracted.warnings,
      ...computeLensEligibility({
        candidateSites: enrichedSites,
        coverageConfidence: computedCoverage,
      }).warnings,
    ]),
  };

  // Manual curation can later merge or override dossier fields here before caching.
  if (!didFallbackFromError) {
    await writeCache("dossiers", key, dossier);
  }

  return {
    dossier,
    fromCache: false,
  };
}

export async function getCityDossierByKey(key: string) {
  return readCache<CityDossier>("dossiers", key, DOSSIER_CACHE_TTL_MS);
}
