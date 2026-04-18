import "server-only";

import { readCache, writeCache } from "@/lib/history/cache";
import { cacheKeyFor } from "@/lib/history/utils";

const ENTITY_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

interface WikidataEntity {
  id: string;
  labels?: Record<string, { value: string }>;
  aliases?: Record<string, Array<{ value: string }>>;
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
  sitelinks?: Record<string, { title: string }>;
}

export async function searchWikidataEntity(query: string) {
  const cacheKey = cacheKeyFor("wikidata-search", query);
  const cached = await readCache<WikidataSearchResult | null>("images", cacheKey, ENTITY_CACHE_TTL_MS);
  if (cached !== null) {
    return cached;
  }

  const url =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json" +
    `&language=en&limit=1&type=item&search=${encodeURIComponent(query)}`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    search?: Array<{ id: string; label?: string; description?: string }>;
  };
  const match = json.search?.[0]
    ? {
        id: json.search[0].id,
        label: json.search[0].label ?? "",
        description: json.search[0].description ?? "",
      }
    : null;

  await writeCache("images", cacheKey, match);
  return match;
}

export async function getWikidataEntity(entityId: string) {
  const cacheKey = cacheKeyFor("wikidata-entity", entityId);
  const cached = await readCache<WikidataEntity | null>("images", cacheKey, ENTITY_CACHE_TTL_MS);
  if (cached !== null) {
    return cached;
  }

  const url =
    "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json" +
    `&languages=en&sites=enwiki&ids=${encodeURIComponent(entityId)}`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { entities?: Record<string, WikidataEntity> };
  const entity = json.entities?.[entityId] ?? null;
  await writeCache("images", cacheKey, entity);
  return entity;
}

export function readCoordinateClaim(entity: WikidataEntity | null) {
  const claim = entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value as
    | { latitude?: number; longitude?: number }
    | undefined;
  if (!claim?.latitude || !claim?.longitude) {
    return null;
  }

  return {
    lat: claim.latitude,
    lng: claim.longitude,
  };
}

export function readImageClaim(entity: WikidataEntity | null) {
  const claim = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return typeof claim === "string" ? claim : null;
}

export function readWikipediaTitle(entity: WikidataEntity | null) {
  return entity?.sitelinks?.enwiki?.title ?? null;
}

export function readAliases(entity: WikidataEntity | null) {
  return entity?.aliases?.en?.map((alias) => alias.value) ?? [];
}

interface WikidataSearchResult {
  id: string;
  label: string;
  description: string;
}
