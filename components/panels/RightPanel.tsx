"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";

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
  captureRef: RefObject<HTMLDivElement | null>;
  onSelectPlace: (placeId: string) => void;
  onSelectChapterIndex: (index: number) => void;
  onToggleFullscreen: () => void;
}

function ExpandIcon({ fullscreen }: { fullscreen: boolean }) {
  return (
    <span className="relative block h-4 w-4">
      <span
        className={`absolute left-0 top-0 h-[7px] w-[7px] border-l-[1.5px] border-t-[1.5px] border-current ${
          fullscreen ? "translate-x-[2px] translate-y-[2px]" : ""
        }`}
      />
      <span
        className={`absolute right-0 top-0 h-[7px] w-[7px] border-r-[1.5px] border-t-[1.5px] border-current ${
          fullscreen ? "-translate-x-[2px] translate-y-[2px]" : ""
        }`}
      />
      <span
        className={`absolute bottom-0 left-0 h-[7px] w-[7px] border-b-[1.5px] border-l-[1.5px] border-current ${
          fullscreen ? "translate-x-[2px] -translate-y-[2px]" : ""
        }`}
      />
      <span
        className={`absolute bottom-0 right-0 h-[7px] w-[7px] border-b-[1.5px] border-r-[1.5px] border-current ${
          fullscreen ? "-translate-x-[2px] -translate-y-[2px]" : ""
        }`}
      />
    </span>
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
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,#fcfaf5_0%,#f5efe4_100%)]">
      <div className="placeholder-rings pointer-events-none absolute inset-0">
        <div className="placeholder-ring left-[20%] top-[16%] h-56 w-56" />
        <div className="placeholder-ring delay-1 left-[58%] top-[18%] h-72 w-72" />
        <div className="placeholder-ring delay-2 left-[34%] top-[48%] h-64 w-64" />
      </div>
      <div className="placeholder-grid pointer-events-none absolute inset-6 rounded-[28px]" />
      <div className="placeholder-scan pointer-events-none absolute inset-y-8 left-[18%] w-px bg-[linear-gradient(180deg,transparent,rgba(132,100,61,0.28),transparent)]" />
      <div className="placeholder-scan delay-2 pointer-events-none absolute inset-y-10 right-[24%] w-px bg-[linear-gradient(180deg,transparent,rgba(132,100,61,0.18),transparent)]" />

      <div className="relative z-10 max-w-[36rem] px-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8374]">
          {eyebrow}
        </p>
        <h2 className="mt-4 text-[2.4rem] font-extrabold leading-[0.96] tracking-[-0.07em] text-[#1f1a14]">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-[28rem] text-[15px] leading-7 text-[#6d6254]">{body}</p>
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
  captureRef,
  onSelectPlace,
  onSelectChapterIndex,
  onToggleFullscreen,
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

  return (
    <section
      className={`panel-surface flex min-h-0 flex-col rounded-[32px] p-3 ${
        isMapFullscreen ? "fixed inset-3 z-50" : "h-full"
      }`}
    >
      {stage === "intro" ? (
        <PlaceholderStage
          eyebrow="MapTL"
          title="A map opens here."
          body="Search a city on the left. Once the place resolves, the timeline stays tied to surviving sites and urban traces that can actually be mapped."
        />
      ) : null}

      {stage === "step-1" ? (
        <PlaceholderStage
          eyebrow={isSetupLoading ? "Resolving place" : "Step 1"}
          title={isSetupLoading ? "Locating the city." : "The map waits for a place."}
          body={
            isSetupLoading
              ? `Resolving ${setupInput || "your search"} and building a standing-history dossier.`
              : "Type a place in India. Step 2 will only surface eras and interpretation lenses supported by evidence."
          }
        />
      ) : null}

      {mapVisible && destination ? (
        <div ref={captureRef} className="relative h-full min-h-0 overflow-hidden rounded-[30px]">
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
          />

          <div className="pointer-events-none absolute inset-x-5 top-5 z-10 flex items-start justify-between gap-3">
            <div className="rounded-full border border-[rgba(116,102,82,0.08)] bg-[rgba(255,255,255,0.9)] px-4 py-2 text-sm font-semibold text-[#2a251e] backdrop-blur-md">
              {destination.canonicalLabel}
              {isStoryStage ? ` · ${String(story!.narrative.chapters.length).padStart(2, "0")} stops` : ""}
            </div>

            {isStoryStage ? (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(116,102,82,0.08)] bg-[rgba(255,255,255,0.9)] text-[#2a251e] backdrop-blur-md transition-colors hover:bg-white"
                aria-label={isMapFullscreen ? "Exit fullscreen map" : "Open fullscreen map"}
              >
                <ExpandIcon fullscreen={isMapFullscreen} />
              </button>
            ) : null}
          </div>

          {stage === "step-2" ? (
            <div className="pointer-events-none absolute bottom-5 left-5 z-10 rounded-full border border-[rgba(116,102,82,0.08)] bg-[rgba(255,255,255,0.9)] px-4 py-2 text-sm font-semibold text-[#544b40] backdrop-blur-md">
              Standing-history preview
            </div>
          ) : null}

          {isStoryLoading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(247,242,233,0.68)] backdrop-blur-md">
              <div className="max-w-sm rounded-[28px] border border-[rgba(116,102,82,0.08)] bg-[rgba(255,255,255,0.94)] px-6 py-5 text-center">
                <p className="text-sm font-semibold text-[#201d17]">Generating the validated route...</p>
                <p className="mt-3 text-sm leading-6 text-[#6d6254]">
                  Sequencing only the shortlisted standing sites and updating the map without remounting it.
                </p>
              </div>
            </div>
          ) : null}

          {timelineEnabled ? (
            <div className="absolute inset-x-5 bottom-5 z-10 rounded-[24px] border border-[rgba(116,102,82,0.08)] bg-[rgba(255,255,255,0.92)] px-4 py-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectChapterIndex(Math.max(0, activeChapterIndex - 1))}
                  className="rounded-full bg-[#f3ede3] px-3 py-2 text-xs font-semibold text-[#4b4338] transition-colors hover:bg-[#ece4d8]"
                >
                  Prev
                </button>
                <input
                  type="range"
                  min={0}
                  max={story!.narrative.chapters.length - 1}
                  value={activeChapterIndex}
                  onChange={(event) => onSelectChapterIndex(Number(event.target.value))}
                  className="h-2 flex-1 accent-[#1f1a14]"
                />
                <button
                  type="button"
                  onClick={() =>
                    onSelectChapterIndex(
                      Math.min(story!.narrative.chapters.length - 1, activeChapterIndex + 1),
                    )
                  }
                  className="rounded-full bg-[#f3ede3] px-3 py-2 text-xs font-semibold text-[#4b4338] transition-colors hover:bg-[#ece4d8]"
                >
                  Next
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#201d17]">{activeChapter?.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8f8374]">
                    {activeChapter?.dateLabel}
                  </p>
                </div>
                {activeYear ? (
                  <div className="rounded-full bg-[#f5efe5] px-3 py-2 text-xs font-semibold text-[#5d5448]">
                    {activeYear}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {stage === "summary" ? (
            <div className="absolute bottom-5 left-5 z-10 rounded-full border border-[rgba(116,102,82,0.08)] bg-[rgba(255,255,255,0.9)] px-4 py-2 text-sm font-semibold text-[#544b40] backdrop-blur-md">
              Export-ready map view
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
