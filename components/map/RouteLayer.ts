"use client";

import mapboxgl from "mapbox-gl";

const ROUTE_SOURCE_ID = "maptl-route-base";
const ROUTE_PROGRESS_SOURCE_ID = "maptl-route-progress";
const ROUTE_LAYER_ID = "maptl-route-line";
const ROUTE_PROGRESS_LAYER_ID = "maptl-route-progress-line";

function lineFeature(coordinates: [number, number][]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  };
}

function progressCoordinates(routeCoordinates: [number, number][], activeIndex: number) {
  if (routeCoordinates.length <= 1) {
    return routeCoordinates;
  }

  const boundedIndex = Math.min(routeCoordinates.length - 1, Math.max(0, activeIndex));
  return routeCoordinates.slice(0, Math.max(2, boundedIndex + 1));
}

export function ensureRouteLayers(map: mapboxgl.Map) {
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: lineFeature([]),
    });
  }

  if (!map.getSource(ROUTE_PROGRESS_SOURCE_ID)) {
    map.addSource(ROUTE_PROGRESS_SOURCE_ID, {
      type: "geojson",
      data: lineFeature([]),
    });
  }

  if (!map.getLayer(ROUTE_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      slot: "middle",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#ffffff",
        "line-opacity": 0.3,
        "line-width": 4,
        "line-dasharray": [0.8, 1.6],
        "line-emissive-strength": 0.3,
      },
    });
  }

  if (!map.getLayer(ROUTE_PROGRESS_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_PROGRESS_LAYER_ID,
      type: "line",
      source: ROUTE_PROGRESS_SOURCE_ID,
      slot: "middle",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#4f46e5",
        "line-opacity": 0.96,
        "line-width": 5,
        "line-emissive-strength": 0.9,
      },
    });
  }
}

export function updateRouteSources(
  map: mapboxgl.Map,
  routeCoordinates: [number, number][],
  activeIndex: number,
) {
  const baseSource = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  const progressSource = map.getSource(ROUTE_PROGRESS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (!baseSource || !progressSource) {
    return;
  }

  baseSource.setData(lineFeature(routeCoordinates));
  progressSource.setData(lineFeature(progressCoordinates(routeCoordinates, activeIndex)));
}

export function clearRouteSources(map: mapboxgl.Map) {
  const baseSource = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  const progressSource = map.getSource(ROUTE_PROGRESS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;

  baseSource?.setData(lineFeature([]));
  progressSource?.setData(lineFeature([]));
}
