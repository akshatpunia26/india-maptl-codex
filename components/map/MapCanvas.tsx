"use client";

import { useEffect, useRef, useState } from "react";
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

const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

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
  showSatellite?: boolean;
}

function configureBasemap(map: mapboxgl.Map) {
  try {
    map.setConfigProperty("basemap", "lightPreset", "day");
    map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
  } catch {
    // basemap config only available on Mapbox Standard style
  }

  if ("setFog" in map) {
    try {
      map.setFog({
        color: "rgb(233, 238, 244)",
        "high-color": "rgb(239, 243, 247)",
        "space-color": "rgb(244, 246, 248)",
        range: [-1, 3],
        "horizon-blend": 0.08,
      });
    } catch {
      // fog may not be supported on all styles
    }
  }

  if (!map.getSource("mapbox-dem")) {
    try {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({
        source: "mapbox-dem",
        exaggeration: 1.03,
      });
    } catch {
      // terrain unavailable on some styles
    }
  }
}

function attachMarkerEvents(
  map: mapboxgl.Map,
  latestSelectRef: React.MutableRefObject<((id: string) => void) | undefined>,
) {
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

  for (const layerId of stopLayerIds) {
    map.on("click", layerId, markerClickHandler);
    map.on("mouseenter", layerId, setPointer);
    map.on("mouseleave", layerId, clearPointer);
  }
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
  showSatellite = false,
}: MapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const latestSelectRef = useRef(onMarkerSelect);
  const previousDestinationKeyRef = useRef("");
  const previousActivePlaceRef = useRef("");
  const previousSceneRef = useRef("");
  const initialViewRef = useRef({ destination, compact });

  // Refs for current data so satellite toggle can re-apply after style load
  const currentPlacesRef = useRef(places);
  const currentRouteRef = useRef(routeCoordinates);
  const currentActivePlaceIdRef = useRef(activePlaceId);
  const currentShowMarkersRef = useRef(showMarkers);
  const currentShowRouteRef = useRef(showRoute);
  const currentShowLabelsRef = useRef(showLabels);

  // Increment to force data-update effect after satellite style loads
  const [styleRevision, setStyleRevision] = useState(0);

  useEffect(() => {
    latestSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  // Keep data refs current every render
  currentPlacesRef.current = places;
  currentRouteRef.current = routeCoordinates;
  currentActivePlaceIdRef.current = activePlaceId;
  currentShowMarkersRef.current = showMarkers;
  currentShowRouteRef.current = showRoute;
  currentShowLabelsRef.current = showLabels;

  // Map initialization
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

    map.on("load", () => {
      readyRef.current = true;
      configureBasemap(map);
      ensureRouteLayers(map);
      ensureStopLayers(map);
      attachMarkerEvents(map, latestSelectRef);

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

  // Satellite toggle — switch style and rebuild layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }

    const targetStyle = showSatellite ? SATELLITE_STYLE : getLiveMapStyleUrl();

    readyRef.current = false;

    map.once("style.load", () => {
      if (!showSatellite) {
        configureBasemap(map);
      }
      ensureRouteLayers(map);
      ensureStopLayers(map);
      attachMarkerEvents(map, latestSelectRef);
      readyRef.current = true;
      setStyleRevision((r) => r + 1);
    });

    map.setStyle(targetStyle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSatellite]);

  // Data update — runs when any relevant prop or styleRevision changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }

    const sceneKey = `${showMarkers ? "story" : "preview"}:${showRoute ? "route" : "no-route"}:${showLabels ? "labels" : "no-labels"}`;
    const destinationKey = destination.canonicalLabel;
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
        duration: 900,
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
    styleRevision,
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
    <div className="map-frame relative h-full overflow-hidden rounded-[26px] border border-[rgba(116,102,82,0.08)] bg-[#eef2f5]">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(117,133,153,0.06))]" />
    </div>
  );
}
