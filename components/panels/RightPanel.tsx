"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { extractYear } from "@/lib/journey/helpers";
import { AppStage, MapDestination, StoryPayload } from "@/lib/journey/types";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
});

interface RightPanelProps {
  stage: AppStage;
  setupInput: string;
  destination: MapDestination | null;
  story: StoryPayload | null;
  activeChapterIndex: number;
  isSetupLoading: boolean;
  isStoryLoading: boolean;
  isMapFullscreen: boolean;
  showSatellite: boolean;
  captureRef: RefObject<HTMLDivElement | null>;
  onSelectPlace: (placeId: string) => void;
  onSelectChapterIndex: (index: number) => void;
  onToggleFullscreen: () => void;
  onToggleSatellite: () => void;
}

const DOSSIER_LINES = [
  "Reading the city's bones…",
  "Surfacing what still stands…",
  "Filtering to surviving layers…",
  "Mapping the living archive…",
];

const STORY_LINES = [
  "Threading the route…",
  "Sequencing the stops…",
  "The map is remembering…",
  "Lacing up your walking order…",
  "Consulting the archive…",
];

function useCyclingLine(lines: readonly string[], active: boolean, interval = 2200) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % lines.length), interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, lines.length, interval]);

  return lines[index];
}

function ExpandIcon({ fullscreen }: { fullscreen: boolean }) {
  return (
    <span className="relative block h-4 w-4">
      <span className={`absolute left-0 top-0 h-[7px] w-[7px] border-l-[1.5px] border-t-[1.5px] border-current ${fullscreen ? "translate-x-[2px] translate-y-[2px]" : ""}`} />
      <span className={`absolute right-0 top-0 h-[7px] w-[7px] border-r-[1.5px] border-t-[1.5px] border-current ${fullscreen ? "-translate-x-[2px] translate-y-[2px]" : ""}`} />
      <span className={`absolute bottom-0 left-0 h-[7px] w-[7px] border-b-[1.5px] border-l-[1.5px] border-current ${fullscreen ? "translate-x-[2px] -translate-y-[2px]" : ""}`} />
      <span className={`absolute bottom-0 right-0 h-[7px] w-[7px] border-b-[1.5px] border-r-[1.5px] border-current ${fullscreen ? "-translate-x-[2px] -translate-y-[2px]" : ""}`} />
    </span>
  );
}

function SatelliteIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      {/* globe rings */}
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="7.5" cy="7.5" rx="3" ry="6" stroke="currentColor" strokeWidth="1.1" />
      <line x1="1.5" y1="7.5" x2="13.5" y2="7.5" stroke="currentColor" strokeWidth="1.1" />
      {active ? (
        <circle cx="7.5" cy="7.5" r="2" fill="currentColor" />
      ) : null}
    </svg>
  );
}

function PlaceholderStage({
  title,
  body,
  eyebrow,
}: {
  title: string;
  body: string;
  eyebrow: string;
}) {
  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#fcfaf5_0%,#f5efe4_100%)]">
      <div className="placeholder-rings pointer-events-none absolute inset-0">
        <div className="placeholder-ring left-[20%] top-[16%] h-56 w-56" />
        <div className="placeholder-ring delay-1 left-[58%] top-[18%] h-72 w-72" />
        <div className="placeholder-ring delay-2 left-[34%] top-[48%] h-64 w-64" />
      </div>
      <div className="placeholder-grid pointer-events-none absolute inset-6 rounded-[26px]" />
      <div className="placeholder-scan pointer-events-none absolute inset-y-8 left-[18%] w-px bg-[linear-gradient(180deg,transparent,rgba(132,100,61,0.28),transparent)]" />
      <div className="placeholder-scan delay-2 pointer-events-none absolute inset-y-10 right-[24%] w-px bg-[linear-gradient(180deg,transparent,rgba(132,100,61,0.18),transparent)]" />

      <div className="relative z-10 max-w-[36rem] px-8 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89b8a]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-[2.2rem] font-extrabold leading-[0.96] tracking-[-0.07em] text-[#1f1a14]">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-[28rem] text-[14px] leading-[1.8] text-[#6d6254]">{body}</p>
      </div>
    </div>
  );
}

export function RightPanel({
  stage,
  setupInput,
  destination,
  story,
  activeChapterIndex,
  isSetupLoading,
  isStoryLoading,
  isMapFullscreen,
  showSatellite,
  captureRef,
  onSelectPlace,
  onSelectChapterIndex,
  onToggleFullscreen,
  onToggleSatellite,
}: RightPanelProps) {
  const activeChapter = story?.narrative.chapters[activeChapterIndex] ?? story?.narrative.chapters[0] ?? null;
  const activePlaceId = activeChapter?.placeId ?? "";
  const activeYear = activeChapter ? extractYear(activeChapter.dateLabel) : null;
  const mapVisible = Boolean(destination && stage !== "intro" && stage !== "step-1");
  const isStoryStage = Boolean(destination && story && (stage === "step-3" || stage === "summary"));
  const timelineEnabled =
    isStoryStage &&
    stage !== "summary" &&
    story!.narrative.chapters.length > 1 &&
    story!.narrative.chapters.some((chapter) => extractYear(chapter.dateLabel) !== null);

  const dossierLine = useCyclingLine(DOSSIER_LINES, isSetupLoading);
  const storyLine = useCyclingLine(STORY_LINES, isStoryLoading);

  const chapterCount = story?.narrative.chapters.length ?? 0;

  return (
    <section
      className={`panel-surface flex min-h-0 flex-col rounded-[28px] p-2.5 ${
        isMapFullscreen ? "fixed inset-3 z-50" : "h-full"
      }`}
    >
      {stage === "intro" ? (
        <PlaceholderStage
          eyebrow="maptl"
          title="A map opens here."
          body="Search a city on the left. The timeline stays tied to surviving sites and urban traces that can be mapped."
        />
      ) : null}

      {stage === "step-1" ? (
        <PlaceholderStage
          eyebrow={isSetupLoading ? "Resolving…" : "Step 1"}
          title={isSetupLoading ? dossierLine : "The map waits for a place."}
          body={
            isSetupLoading
              ? `Building a standing-history dossier for ${setupInput || "your city"}.`
              : "Type a place in India. Step 2 surfaces only eras supported by evidence."
          }
        />
      ) : null}

      {mapVisible && destination ? (
        <div ref={captureRef} className="relative h-full min-h-0 overflow-hidden rounded-[26px]">
          <MapCanvas
            destination={destination}
            activePlaceId={activePlaceId}
            onMarkerSelect={onSelectPlace}
            places={story?.places ?? []}
            routeCoordinates={story?.narrative.routeCoordinates ?? []}
            showRoute={isStoryStage}
            showLabels={isStoryStage}
            showMarkers={isStoryStage}
            enableFocusFly={stage === "step-3"}
            compact={stage === "step-2"}
            showSatellite={showSatellite}
          />

          {/* Top overlay bar */}
          <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3">
            <div className="rounded-full border border-[rgba(116,102,82,0.1)] bg-[rgba(255,255,255,0.92)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#2a251e] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
              {destination.canonicalLabel}
              {isStoryStage ? ` · ${String(story!.narrative.chapters.length).padStart(2, "0")} stops` : ""}
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              {/* Satellite toggle */}
              <button
                type="button"
                onClick={onToggleSatellite}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
                  showSatellite
                    ? "border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.12)] text-[#4f46e5]"
                    : "border-[rgba(116,102,82,0.1)] bg-[rgba(255,255,255,0.92)] text-[#2a251e] hover:bg-white"
                }`}
                aria-label={showSatellite ? "Switch to street map" : "Switch to satellite view"}
              >
                <SatelliteIcon active={showSatellite} />
              </button>

              {/* Fullscreen toggle */}
              {isStoryStage ? (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(116,102,82,0.1)] bg-[rgba(255,255,255,0.92)] text-[#2a251e] backdrop-blur-md transition-colors hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
                  aria-label={isMapFullscreen ? "Exit fullscreen map" : "Open fullscreen map"}
                >
                  <ExpandIcon fullscreen={isMapFullscreen} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Step-2 badge */}
          {stage === "step-2" ? (
            <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full border border-[rgba(116,102,82,0.1)] bg-[rgba(255,255,255,0.92)] px-3.5 py-1.5 text-[12px] font-semibold text-[#544b40] backdrop-blur-md">
              Preview · standing sites
            </div>
          ) : null}

          {/* Story loading overlay */}
          <AnimatePresence>
            {isStoryLoading ? (
              <motion.div
                key="story-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(247,242,233,0.72)] backdrop-blur-md"
              >
                <div className="max-w-sm rounded-[24px] border border-[rgba(116,102,82,0.1)] bg-[rgba(255,255,255,0.96)] px-6 py-5 text-center shadow-[0_16px_48px_rgba(68,55,39,0.1)]">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[rgba(116,102,82,0.2)] border-t-[#84643d]" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={storyLine}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 text-[14px] font-semibold text-[#201d17]"
                    >
                      {storyLine}
                    </motion.p>
                  </AnimatePresence>
                  <p className="mt-2 text-[12.5px] leading-[1.65] text-[#6d6254]">
                    Sequencing validated stops, no remount needed.
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Timeline — step-3 only */}
          {timelineEnabled ? (
            <div className="absolute inset-x-4 bottom-4 z-10">
              <div className="rounded-[20px] border border-[rgba(116,102,82,0.1)] bg-[rgba(255,255,255,0.94)] px-4 py-3.5 backdrop-blur-md shadow-[0_4px_20px_rgba(68,55,39,0.1)]">
                {/* Chapter info row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#1f1a14]">
                      {String(activeChapterIndex + 1).padStart(2, "0")} · {activeChapter?.title}
                    </p>
                    <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.14em] text-[#8f8374]">
                      {activeChapter?.dateLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {activeYear ? (
                      <span className="rounded-full bg-[#f0ebe3] px-2.5 py-1 text-[11px] font-semibold text-[#5d5448]">
                        {activeYear}
                      </span>
                    ) : null}
                    <span className="text-[11px] font-semibold text-[#a89b8a]">
                      {activeChapterIndex + 1}/{chapterCount}
                    </span>
                  </div>
                </div>

                {/* Slider row */}
                <div className="mt-3 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectChapterIndex(Math.max(0, activeChapterIndex - 1))}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0ebe3] text-[#3a342b] transition-colors hover:bg-[#e7dfd5] disabled:opacity-40"
                    disabled={activeChapterIndex === 0}
                  >
                    <svg width="8" height="11" viewBox="0 0 8 11" fill="currentColor" aria-hidden>
                      <path d="M6.5 1L1.5 5.5L6.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                    </svg>
                  </button>

                  <div className="relative flex-1">
                    {/* Progress track */}
                    <div className="h-0.5 w-full rounded-full bg-[rgba(116,102,82,0.15)]">
                      <div
                        className="h-full rounded-full bg-[#1f1a14] transition-all duration-300"
                        style={{
                          width: chapterCount > 1
                            ? `${(activeChapterIndex / (chapterCount - 1)) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={chapterCount - 1}
                      value={activeChapterIndex}
                      onChange={(event) => onSelectChapterIndex(Number(event.target.value))}
                      className="timeline-slider absolute inset-y-0 -top-[7px] w-full opacity-0 cursor-pointer"
                      aria-label="Chapter progress"
                    />
                    {/* Tick dots */}
                    <div className="pointer-events-none absolute inset-y-0 -top-[3px] flex w-full items-center justify-between px-[0px]">
                      {Array.from({ length: Math.min(chapterCount, 12) }).map((_, i) => {
                        const mappedIndex = Math.round((i / (Math.min(chapterCount, 12) - 1)) * (chapterCount - 1));
                        return (
                          <span
                            key={i}
                            className={`block h-[5px] w-[5px] rounded-full transition-colors ${
                              mappedIndex <= activeChapterIndex
                                ? "bg-[#1f1a14]"
                                : "bg-[rgba(116,102,82,0.2)]"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectChapterIndex(Math.min(chapterCount - 1, activeChapterIndex + 1))}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0ebe3] text-[#3a342b] transition-colors hover:bg-[#e7dfd5] disabled:opacity-40"
                    disabled={activeChapterIndex === chapterCount - 1}
                  >
                    <svg width="8" height="11" viewBox="0 0 8 11" fill="currentColor" aria-hidden>
                      <path d="M1.5 1L6.5 5.5L1.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Summary badge */}
          {stage === "summary" ? (
            <div className="absolute bottom-4 left-4 z-10 rounded-full border border-[rgba(116,102,82,0.1)] bg-[rgba(255,255,255,0.92)] px-3.5 py-1.5 text-[12px] font-semibold text-[#544b40] backdrop-blur-md">
              Export-ready view
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
