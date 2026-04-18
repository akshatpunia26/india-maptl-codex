"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

import {
  clearStopSource,
  ensureStopLayers,
  stopLayerIds,
  updateStopSource,
} from "@/components/map/MapMarkers";
import { PlaceholderMap } from "@/components/map/PlaceholderMap";
import {
  clearRouteSources,
  ensureRouteLayers,
  updateRouteSources,
} from "@/components/map/RouteLayer";
import { MapDestination } from "@/lib/journey/types";
import { Place } from "@/lib/mock/types";
import { getLiveMapStyleUrl, hasMapboxToken, mapboxToken } from "@/lib/utils/map";

interface MapCanvasProps {
  destination: MapDestination;
  activePlaceId?: string;
  onMarkerSelect?: (placeId: string) => void;
  places?: Place[];
  routeCoordinates?: [number, number][];
  showRoute?: boolean;
  showLabels?: boolean;
  showMarkers?: boolean;
  enableFocusFly?: boolean;
  compact?: boolean;
}

function configureBasemap(map: mapboxgl.Map) {
  map.setConfigProperty("basemap", "lightPreset", "day");
  map.setConfigProperty("basemap", "showPointOfInterestLabels", false);

  if ("setFog" in map) {
    map.setFog({
      color: "rgb(233, 238, 244)",
      "high-color": "rgb(239, 243, 247)",
      "space-color": "rgb(244, 246, 248)",
      range: [-1, 3],
      "horizon-blend": 0.08,
    });
  }

  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
  }

  map.setTerrain({
    source: "mapbox-dem",
    exaggeration: 1.03,
  });
}

export default function MapCanvas({
  destination,
  activePlaceId = "",
  onMarkerSelect,
  places = [],
  routeCoordinates = [],
  showRoute = true,
  showLabels = false,
  showMarkers = true,
  enableFocusFly = true,
  compact = false,
}: MapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const latestSelectRef = useRef(onMarkerSelect);
  const previousDestinationKeyRef = useRef("");
  const previousActivePlaceRef = useRef("");
  const previousSceneRef = useRef("");
  const initialViewRef = useRef({
    destination,
    compact,
  });

  useEffect(() => {
    latestSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  useEffect(() => {
    if (!hasMapboxToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken!;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getLiveMapStyleUrl(),
      center: initialViewRef.current.destination.center,
      zoom: initialViewRef.current.destination.zoom,
      pitch: initialViewRef.current.compact ? 28 : 42,
      bearing: initialViewRef.current.compact ? 4 : 8,
      antialias: true,
      attributionControl: false,
      config: {
        basemap: {
          lightPreset: "day",
          showPointOfInterestLabels: false,
        },
      },
    });

    mapRef.current = map;

    const markerClickHandler = (event: mapboxgl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const placeId = typeof feature?.properties?.id === "string" ? feature.properties.id : null;
      if (placeId) {
        latestSelectRef.current?.(placeId);
      }
    };

    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("load", () => {
      readyRef.current = true;
      configureBasemap(map);
      ensureRouteLayers(map);
      ensureStopLayers(map);

      for (const layerId of stopLayerIds) {
        map.on("click", layerId, markerClickHandler);
        map.on("mouseenter", layerId, setPointer);
        map.on("mouseleave", layerId, clearPointer);
      }

      map.fitBounds(initialViewRef.current.destination.bounds, {
        padding: initialViewRef.current.compact ? 48 : 72,
        duration: 0,
      });
    });

    resizeObserverRef.current = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserverRef.current.observe(mapContainerRef.current);

    return () => {
      readyRef.current = false;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }

    const sceneKey = `${showMarkers ? "story" : "preview"}:${showRoute ? "route" : "no-route"}:${showLabels ? "labels" : "no-labels"}`;
    const destinationKey = destination.mapboxId || destination.canonicalLabel;
    const activeIndex = Math.max(
      0,
      places.findIndex((place) => place.id === activePlaceId),
    );
    const activePlace = places[activeIndex] ?? null;

    if (showMarkers && places.length > 0) {
      updateStopSource(map, places, activePlaceId);
      map.setLayoutProperty("maptl-stops-labels", "visibility", showLabels ? "visible" : "none");
    } else {
      clearStopSource(map);
    }

    if (showRoute && routeCoordinates.length > 1) {
      updateRouteSources(map, routeCoordinates, activeIndex);
    } else {
      clearRouteSources(map);
    }

    const destinationChanged = previousDestinationKeyRef.current !== destinationKey;
    const activePlaceChanged = previousActivePlaceRef.current !== activePlaceId;
    const sceneChanged = previousSceneRef.current !== sceneKey;

    previousDestinationKeyRef.current = destinationKey;
    previousActivePlaceRef.current = activePlaceId;
    previousSceneRef.current = sceneKey;

    if (destinationChanged || (!showMarkers && sceneChanged)) {
      map.fitBounds(destination.bounds, {
        padding: compact ? 48 : 72,
        duration: 900,
        essential: true,
      });
      return;
    }

    if (showMarkers && enableFocusFly && activePlace && (activePlaceChanged || sceneChanged)) {
      map.easeTo({
        center: [activePlace.lng, activePlace.lat],
        zoom: Math.max(destination.zoom + 1.2, 13),
        pitch: compact ? 28 : 42,
        bearing: compact ? 4 : 8,
        duration: 1000,
        essential: true,
      });
    }
  }, [
    activePlaceId,
    compact,
    destination,
    enableFocusFly,
    places,
    routeCoordinates,
    showLabels,
    showMarkers,
    showRoute,
  ]);

  if (!hasMapboxToken) {
    return (
      <PlaceholderMap
        destination={destination}
        activePlaceId={activePlaceId}
        places={places}
        routeCoordinates={routeCoordinates}
        showRoute={showRoute}
        showLabels={showLabels}
        showMarkers={showMarkers}
        onMarkerSelect={onMarkerSelect}
      />
    );
  }

  return (
    <div className="map-frame relative h-full overflow-hidden rounded-[28px] border border-[rgba(116,102,82,0.08)] bg-[#eef2f5]">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(117,133,153,0.08))]" />
    </div>
  );
}
