import { createHash } from "node:crypto";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function cacheKeyFor(...parts: Array<string | number | undefined>) {
  const joined = parts.filter(Boolean).join("::");
  const slug = slugify(joined) || "entry";
  const hash = createHash("sha1").update(joined).digest("hex").slice(0, 12);
  return `${slug}-${hash}`;
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function bboxFromCenter(
  center: [number, number],
  radiusKm: number,
): [number, number, number, number] {
  const [lng, lat] = center;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

export function radiusFromBbox(bbox?: [number, number, number, number]) {
  if (!bbox) {
    return 12;
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;
  const latKm = Math.abs(maxLat - minLat) * 111;
  const lngKm = Math.abs(maxLng - minLng) * 111 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  return Math.max(4, Math.round(Math.max(latKm, lngKm) / 2));
}

export function formatDateLabel(startYear: number, endYear: number) {
  if (startYear === endYear) {
    return `${startYear}`;
  }

  if (Math.abs(endYear - startYear) <= 20) {
    return `${startYear}–${endYear}`;
  }

  return `${startYear}`;
}

export function inferZoomFromBbox(bbox?: [number, number, number, number]) {
  const radiusKm = radiusFromBbox(bbox);

  if (radiusKm <= 3) {
    return 13.4;
  }
  if (radiusKm <= 8) {
    return 12.4;
  }
  if (radiusKm <= 15) {
    return 11.5;
  }
  if (radiusKm <= 30) {
    return 10.7;
  }

  return 9.8;
}
