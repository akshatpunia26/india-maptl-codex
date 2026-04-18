import { NarrativeChapter, NarrativeResult, StylePreset } from "@/lib/mock/types";
import { StoryPlace } from "@/lib/journey/types";

export function extractYear(dateLabel: string) {
  const match = dateLabel.match(/\d{3,4}/);
  return match ? Number(match[0]) : null;
}

export function buildRangeLabel(chapters: NarrativeChapter[]) {
  const first = chapters[0]?.dateLabel ?? "";
  const last = chapters[chapters.length - 1]?.dateLabel ?? "";
  return `${first} – ${last}`;
}

export function buildSpanLabel(chapters: NarrativeChapter[]) {
  const first = chapters[0] ? extractYear(chapters[0].dateLabel) : null;
  const last = chapters[chapters.length - 1]
    ? extractYear(chapters[chapters.length - 1].dateLabel)
    : null;

  if (first === null || last === null) {
    return `${chapters.length} stops`;
  }

  return `${Math.abs(last - first)} y`;
}

export function buildBoundsFromCenter(
  center: [number, number],
  radiusKm: number,
): [[number, number], [number, number]] {
  const [lng, lat] = center;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  return [
    [lng - lngDelta, lat - latDelta],
    [lng + lngDelta, lat + latDelta],
  ];
}

export function buildZoomFromRadius(radiusKm: number) {
  if (radiusKm <= 3) {
    return 13.2;
  }
  if (radiusKm <= 8) {
    return 12.4;
  }
  if (radiusKm <= 15) {
    return 11.7;
  }
  if (radiusKm <= 30) {
    return 10.9;
  }
  return 10.1;
}

export function buildRouteCoordinates(places: StoryPlace[], chapters: NarrativeChapter[]) {
  const placeMap = new Map(places.map((place) => [place.id, place]));

  return chapters
    .map((chapter) => placeMap.get(chapter.placeId))
    .filter((place): place is StoryPlace => Boolean(place))
    .map((place) => [place.lng, place.lat] as [number, number]);
}

export function buildNarrativeResult({
  title,
  chapters,
  places,
  stylePreset,
  composedIn,
  readMinutes,
  walkKilometers,
}: {
  title: string;
  chapters: NarrativeChapter[];
  places: StoryPlace[];
  stylePreset: StylePreset;
  composedIn?: string;
  readMinutes: number;
  walkKilometers: number;
}): NarrativeResult {
  const routeCoordinates = buildRouteCoordinates(places, chapters);

  return {
    title,
    subtitle: `${composedIn ? `Composed in ${composedIn} · ` : ""}${String(chapters.length).padStart(2, "0")} stops · ${buildRangeLabel(chapters)}`,
    chapters,
    routeCoordinates,
    stylePreset,
    composedIn,
    spanLabel: buildSpanLabel(chapters),
    readMinutes,
    walkKilometers,
  };
}
