import { bboxFromCenter, inferZoomFromBbox } from "@/lib/history/utils";
import { MapDestination } from "@/lib/journey/types";
import { StylePreset } from "@/lib/mock/types";

export const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export const hasMapboxToken = Boolean(mapboxToken);

type BoundsLike = [[number, number], [number, number]];

export function getLiveMapStyleUrl() {
  return "mapbox://styles/mapbox/standard";
}

export function getMapStyleUrl(stylePreset: StylePreset) {
  return stylePreset === "museum-poster" ? getLiveMapStyleUrl() : getLiveMapStyleUrl();
}

export function toMapDestination(place: {
  label: string;
  canonicalLabel: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  placeType: string;
  mapboxId: string;
  displayContext: string;
}): MapDestination {
  const bbox = place.bbox ?? bboxFromCenter(place.center, 12);
  const bounds: [[number, number], [number, number]] = [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[3]],
  ];

  return {
    ...place,
    bounds,
    zoom: inferZoomFromBbox(bbox),
  };
}

export function getProjectedPoint(bounds: BoundsLike, lng: number, lat: number) {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;

  return {
    x: Math.max(8, Math.min(92, x)),
    y: Math.max(10, Math.min(90, y)),
  };
}
