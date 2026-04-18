import "server-only";

import { readCache, writeCache } from "@/lib/history/cache";
import { SiteImage } from "@/lib/history/types";
import { cacheKeyFor } from "@/lib/history/utils";

const IMAGE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function selectCommonsImage(fileName: string | null): Promise<SiteImage | null> {
  if (!fileName) {
    return null;
  }

  const normalizedName = fileName.startsWith("File:") ? fileName : `File:${fileName}`;
  const cacheKey = cacheKeyFor("commons-image", normalizedName);
  const cached = await readCache<SiteImage | null>("images", cacheKey, IMAGE_CACHE_TTL_MS);
  if (cached !== null) {
    return cached;
  }

  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
    `&titles=${encodeURIComponent(normalizedName)}` +
    "&iiprop=url|size|extmetadata&iiurlwidth=1200";

  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as CommonsQueryResponse;
  const page = Object.values(json.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) {
    await writeCache("images", cacheKey, null);
    return null;
  }

  const metadata: SiteImage = {
    url: info.url,
    thumbUrl: info.thumburl ?? info.url,
    sourcePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(normalizedName.replace(/ /g, "_"))}`,
    attribution: stripHtml(info.extmetadata?.Artist?.value) || "Wikimedia Commons",
    license: info.extmetadata?.LicenseShortName?.value || "Unknown",
    width: info.width ?? 0,
    height: info.height ?? 0,
    imageConfidence: 0.9,
  };

  await writeCache("images", cacheKey, metadata);
  return metadata;
}

function stripHtml(value?: string) {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

interface CommonsQueryResponse {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          width?: number;
          height?: number;
          extmetadata?: {
            Artist?: { value?: string };
            LicenseShortName?: { value?: string };
          };
        }>;
      }
    >;
  };
}
