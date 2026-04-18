"use client";

import mapboxgl from "mapbox-gl";

import { Place } from "@/lib/mock/types";

const STOP_SOURCE_ID = "maptl-stops";
const STOP_LAYER_COMPLETED = "maptl-stops-completed";
const STOP_LAYER_UPCOMING = "maptl-stops-upcoming";
const STOP_LAYER_CURRENT = "maptl-stops-current";
const STOP_LAYER_LABELS = "maptl-stops-labels";

export function markerIconMeta() {
  return {
    completed: { fill: "#b7c8dd", stroke: "#ffffff" },
    upcoming: { fill: "#334f6f", stroke: "#ffffff" },
    current: { fill: "#f2a43b", stroke: "#ffffff" },
  };
}

function buildStopCollection(places: Place[], activePlaceId: string) {
  const activeIndex = Math.max(
    0,
    places.findIndex((place) => place.id === activePlaceId),
  );

  return {
    type: "FeatureCollection" as const,
    features: places.map((place, index) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [place.lng, place.lat] as [number, number],
      },
      properties: {
        id: place.id,
        title: place.title,
        order: index + 1,
        markerState:
          index < activeIndex
            ? "completed"
            : place.id === activePlaceId
              ? "current"
              : "upcoming",
      },
    })),
  };
}

export function ensureStopLayers(map: mapboxgl.Map) {
  if (!map.getSource(STOP_SOURCE_ID)) {
    map.addSource(STOP_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }

  if (!map.getLayer(STOP_LAYER_COMPLETED)) {
    map.addLayer({
      id: STOP_LAYER_COMPLETED,
      type: "circle",
      source: STOP_SOURCE_ID,
      slot: "top",
      filter: ["==", ["get", "markerState"], "completed"],
      paint: {
        "circle-radius": 7,
        "circle-color": "#c7d3e0",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.95,
        "circle-emissive-strength": 0.5,
      },
    });
  }

  if (!map.getLayer(STOP_LAYER_UPCOMING)) {
    map.addLayer({
      id: STOP_LAYER_UPCOMING,
      type: "circle",
      source: STOP_SOURCE_ID,
      slot: "top",
      filter: ["==", ["get", "markerState"], "upcoming"],
      paint: {
        "circle-radius": 8,
        "circle-color": "#29435f",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2.2,
        "circle-opacity": 0.92,
        "circle-emissive-strength": 0.7,
      },
    });
  }

  if (!map.getLayer(STOP_LAYER_CURRENT)) {
    map.addLayer({
      id: STOP_LAYER_CURRENT,
      type: "circle",
      source: STOP_SOURCE_ID,
      slot: "top",
      filter: ["==", ["get", "markerState"], "current"],
      paint: {
        "circle-radius": 11,
        "circle-color": "#f2a43b",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2.8,
        "circle-opacity": 1,
        "circle-emissive-strength": 1,
      },
    });
  }

  if (!map.getLayer(STOP_LAYER_LABELS)) {
    map.addLayer({
      id: STOP_LAYER_LABELS,
      type: "symbol",
      source: STOP_SOURCE_ID,
      slot: "top",
      layout: {
        "text-field": ["get", "title"],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 12,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#20283a",
        "text-halo-color": "rgba(255,255,255,0.92)",
        "text-halo-width": 1.2,
        "text-emissive-strength": 0.6,
      },
    });
  }
}

export function updateStopSource(map: mapboxgl.Map, places: Place[], activePlaceId: string) {
  const source = map.getSource(STOP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (!source) {
    return;
  }

  source.setData(buildStopCollection(places, activePlaceId));
}

export function clearStopSource(map: mapboxgl.Map) {
  const source = map.getSource(STOP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (!source) {
    return;
  }

  source.setData({
    type: "FeatureCollection",
    features: [],
  });
}

export const stopLayerIds = [
  STOP_LAYER_COMPLETED,
  STOP_LAYER_UPCOMING,
  STOP_LAYER_CURRENT,
] as const;
