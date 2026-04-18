"use client";

import { MapDestination } from "@/lib/journey/types";
import { Place } from "@/lib/mock/types";
import { getProjectedPoint } from "@/lib/utils/map";

interface PlaceholderMapProps {
  destination: MapDestination;
  activePlaceId?: string;
  places?: Place[];
  routeCoordinates?: [number, number][];
  showRoute?: boolean;
  showLabels?: boolean;
  showMarkers?: boolean;
  onMarkerSelect?: (placeId: string) => void;
}

export function PlaceholderMap({
  destination,
  activePlaceId = "",
  places = [],
  routeCoordinates = [],
  showRoute = true,
  showLabels = false,
  showMarkers = true,
  onMarkerSelect,
}: PlaceholderMapProps) {
  const routePoints = routeCoordinates.map(([lng, lat]) =>
    getProjectedPoint(destination.bounds, lng, lat),
  );
  const routeD = routePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const centerPoint = getProjectedPoint(
    destination.bounds,
    destination.center[0],
    destination.center[1],
  );
  const iconMeta = {
    citadel: { glyph: "◈", accent: "#d39d44", glow: "rgba(211, 157, 68, 0.36)" },
    sanctum: { glyph: "✦", accent: "#cbb8a1", glow: "rgba(203, 184, 161, 0.36)" },
    bazaar: { glyph: "✳", accent: "#6684a4", glow: "rgba(102, 132, 164, 0.34)" },
    archive: { glyph: "⬡", accent: "#58708d", glow: "rgba(88, 112, 141, 0.34)" },
  } as const;

  return (
    <div className="map-frame relative h-full overflow-hidden rounded-[28px] border border-[rgba(116,102,82,0.08)] bg-[linear-gradient(180deg,#f7f4ee_0%,#efe7dc_100%)]">
      <div className="texture-overlay absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(170,138,87,0.07),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,rgba(173,140,94,0.14),transparent_28%),radial-gradient(circle_at_78%_34%,rgba(134,153,168,0.1),transparent_28%),linear-gradient(140deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_100%)]" />

      <div className="absolute left-6 top-6 z-10 rounded-full border border-[rgba(116,102,82,0.1)] bg-[rgba(255,255,255,0.82)] px-4 py-2 text-xs font-semibold text-[#645b50] backdrop-blur-md">
        Placeholder map without Mapbox token
      </div>

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <pattern id="grid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <path
              d="M 8 0 L 0 0 0 8"
              fill="none"
              stroke="rgba(125,109,84,0.06)"
              strokeWidth="0.35"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        <circle
          cx={centerPoint.x}
          cy={centerPoint.y}
          r="9"
          fill="rgba(132,100,61,0.05)"
          stroke="rgba(132,100,61,0.16)"
          strokeWidth="0.55"
        />
        <circle
          cx={centerPoint.x}
          cy={centerPoint.y}
          r="18"
          fill="none"
          stroke="rgba(132,100,61,0.1)"
          strokeWidth="0.45"
          strokeDasharray="1.2 1.8"
        />
        {showRoute && routeD ? (
          <>
            <path
              d={routeD}
              stroke="rgba(132,100,61,0.18)"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={routeD}
              stroke="#8f6c44"
              strokeWidth="0.55"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="0.8 1.8"
            />
          </>
        ) : null}
      </svg>

      {showMarkers
        ? places.map((place) => {
            const point = getProjectedPoint(destination.bounds, place.lng, place.lat);
            const meta = iconMeta[place.iconKey];
            const isActive = place.id === activePlaceId;

            return (
              <button
                key={place.id}
                type="button"
                onClick={() => onMarkerSelect?.(place.id)}
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                <span
                  className="flex items-center justify-center rounded-full border text-center shadow-[0_10px_28px_rgba(68,55,39,0.12)] backdrop-blur-md transition-all duration-200"
                  style={{
                    width: isActive ? 38 : 28,
                    height: isActive ? 38 : 28,
                    color: meta.accent,
                    borderColor: isActive
                      ? "rgba(132,100,61,0.26)"
                      : "rgba(116,102,82,0.12)",
                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), ${meta.glow}), rgba(37, 32, 26, 0.95)`,
                    transform: isActive ? "translateY(-3px)" : "translateY(0)",
                  }}
                >
                  <span className={isActive ? "text-base" : "text-xs"}>{meta.glyph}</span>
                </span>
                {showLabels ? (
                  <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[rgba(116,102,82,0.12)] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-[11px] font-semibold text-[#433b31]">
                    {place.title}
                  </span>
                ) : null}
              </button>
            );
          })
        : null}
    </div>
  );
}
