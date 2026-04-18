"use client";

import {
  LensesGenerationResult,
  NormalizedPlaceCandidate,
} from "@/lib/history/types";
import { ERA_LENS_META, INTERPRETATION_LENS_META } from "@/lib/history/taxonomy";
import {
  AppStage,
  SavedJourney,
  SetupState,
  StoryTab,
} from "@/lib/journey/types";

interface LeftRailProps {
  stage: AppStage;
  setupState: SetupState;
  placeCandidates: NormalizedPlaceCandidate[];
  lensResult: LensesGenerationResult | null;
  currentJourney: SavedJourney | null;
  storyTab: StoryTab;
  activeChapterIndex: number;
  isSuggestionsLoading: boolean;
  isSetupLoading: boolean;
  isStoryLoading: boolean;
  isExporting: boolean;
  statusMessage: string | null;
  exportMessage: string | null;
  onStart: () => void;
  onDestinationInput: (value: string) => void;
  onSelectPlaceCandidate: (candidate: NormalizedPlaceCandidate) => void;
  onApplySuggestion: (value: string) => void;
  onSelectTripLength: (length: string) => void;
  onSelectEra: (era: string) => void;
  onSelectInterpretationLens: (lens: string) => void;
  onSelectPace: (pace: string) => void;
  onContinueToLens: () => void;
  onGenerateStory: () => void;
  onBackToDestination: () => void;
  onBackToLens: () => void;
  onSelectStoryTab: (tab: StoryTab) => void;
  onUpdateNotes: (value: string) => void;
  onSelectChapterIndex: (index: number) => void;
  onEndJourney: () => void;
  onExportMap: () => void;
  onGoHome: () => void;
}

const exampleDestinations = ["New Delhi", "Jaipur", "Madurai", "Ahmedabad"];
const tripLengths = ["Half day", "1 day", "Weekend", "Multi day"];
const paceOptions = ["Slow", "Balanced", "Fast"];

function Breadcrumbs({ stage }: { stage: AppStage }) {
  const labels = [
    { id: "step-1", text: "Step 1 · Journey" },
    { id: "step-2", text: "Step 2 · Lens" },
    { id: "step-3", text: "Step 3 · Story" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f8374]">
      {labels.map((label, index) => (
        <div key={label.id} className="flex items-center gap-2">
          <span className={stage === label.id ? "text-[#1f1a14]" : "text-[#b6ab9b]"}>
            {label.text}
          </span>
          {index < labels.length - 1 ? <span className="text-[#c9bfb0]">/</span> : null}
        </div>
      ))}
    </div>
  );
}

function SelectionChip({
  active,
  label,
  helper,
  onClick,
}: {
  active: boolean;
  label: string;
  helper?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[20px] border px-4 py-3 text-left transition-colors ${
        active
          ? "border-[rgba(132,100,61,0.18)] bg-[#f6efe4]"
          : "border-[rgba(116,102,82,0.08)] bg-white hover:bg-[#faf7f2]"
      }`}
    >
      <p className="text-sm font-semibold text-[#221e18]">{label}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-[#756a5c]">{helper}</p> : null}
    </button>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[22px] border border-[rgba(116,102,82,0.08)] bg-[#fbf8f3] px-4 py-4">
      <p className="text-[1.65rem] font-extrabold tracking-[-0.05em] text-[#201d17]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8c7f6e]">{label}</p>
    </div>
  );
}

export function LeftRail({
  stage,
  setupState,
  placeCandidates,
  lensResult,
  currentJourney,
  storyTab,
  activeChapterIndex,
  isSuggestionsLoading,
  isSetupLoading,
  isStoryLoading,
  isExporting,
  statusMessage,
  exportMessage,
  onStart,
  onDestinationInput,
  onSelectPlaceCandidate,
  onApplySuggestion,
  onSelectTripLength,
  onSelectEra,
  onSelectInterpretationLens,
  onSelectPace,
  onContinueToLens,
  onGenerateStory,
  onBackToDestination,
  onBackToLens,
  onSelectStoryTab,
  onUpdateNotes,
  onSelectChapterIndex,
  onEndJourney,
  onExportMap,
  onGoHome,
}: LeftRailProps) {
  const story = currentJourney?.story ?? null;
  const narrative = story?.narrative ?? null;
  const activeChapter = narrative?.chapters[activeChapterIndex] ?? narrative?.chapters[0] ?? null;
  const activePlace =
    activeChapter && story
      ? story.places.find((place) => place.id === activeChapter.placeId) ?? null
      : null;
  const hasMultipleDays = Boolean(story?.places.some((place) => place.day > 1));

  return (
    <aside className="panel-surface min-h-0 rounded-[32px]">
      <div className="scrollbar-hidden flex h-full flex-col overflow-y-auto px-8 py-7">
        {stage === "intro" ? (
          <div className="mx-auto flex min-h-full w-full max-w-[390px] flex-col justify-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8374]">
                India standing history
              </p>
              <h1 className="mt-4 text-[2.7rem] font-extrabold leading-[0.96] tracking-[-0.07em] text-[#1f1a14]">
                Start with a city.
              </h1>
              <p className="mt-4 max-w-[28rem] text-[15px] leading-7 text-[#6d6254]">
                Search a place in India, surface only the surviving historical layers, then generate a route that stays grounded in what still stands.
              </p>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={onStart}
                className="rounded-full bg-[#1f1a14] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#302921]"
              >
                Start
              </button>
            </div>
          </div>
        ) : null}

        {stage === "step-1" ? (
          <div className="flex min-h-full flex-col">
            <Breadcrumbs stage={stage} />

            <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center">
              <div>
                <h2 className="text-[2.35rem] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#1f1a14]">
                  Where does the history begin?
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-[#6d6254]">
                  Choose a city, town, or urban locality in India. We resolve the map first, then build only from standing sites and surviving urban traces.
                </p>
              </div>

              <div className="mt-8">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                  Destination
                </label>
                <input
                  value={setupState.destinationInput}
                  onChange={(event) => onDestinationInput(event.target.value)}
                  placeholder="Search a city or locality"
                  className="mt-2 w-full rounded-[22px] border border-[rgba(116,102,82,0.1)] bg-white px-4 py-3 text-sm text-[#221e18] outline-none transition-colors placeholder:text-[#aaa08f] focus:border-[rgba(132,100,61,0.22)]"
                />
              </div>

              {placeCandidates.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {placeCandidates.map((candidate) => (
                    <button
                      key={candidate.mapboxId}
                      type="button"
                      onClick={() => onSelectPlaceCandidate(candidate)}
                      className={`rounded-[20px] border px-4 py-3 text-left transition-colors ${
                        setupState.selectedPlace?.mapboxId === candidate.mapboxId
                          ? "border-[rgba(132,100,61,0.18)] bg-[#f6efe4]"
                          : "border-[rgba(116,102,82,0.08)] bg-white hover:bg-[#faf7f2]"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[#221e18]">{candidate.canonicalLabel}</p>
                      <p className="mt-1 text-xs leading-5 text-[#7b6f60]">{candidate.displayContext}</p>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                  Example inputs
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {exampleDestinations.map((place) => (
                    <button
                      key={place}
                      type="button"
                      onClick={() => onApplySuggestion(place)}
                      className="rounded-full border border-[rgba(116,102,82,0.08)] bg-white px-3 py-2 text-sm text-[#5e5549] transition-colors hover:bg-[#faf7f2]"
                    >
                      {place}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                  Trip length
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tripLengths.map((length) => (
                    <button
                      key={length}
                      type="button"
                      onClick={() => onSelectTripLength(length)}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                        setupState.tripLength === length
                          ? "border-[rgba(132,100,61,0.18)] bg-[#f6efe4] text-[#221e18]"
                          : "border-[rgba(116,102,82,0.08)] bg-white text-[#6d6254] hover:bg-[#faf7f2]"
                      }`}
                    >
                      {length}
                    </button>
                  ))}
                </div>
              </div>

              {statusMessage ? (
                <div className="mt-6 rounded-[22px] border border-[rgba(132,100,61,0.12)] bg-[#faf4ea] px-4 py-4 text-sm leading-6 text-[#6f624f]">
                  {statusMessage}
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-[rgba(116,102,82,0.08)] pt-5">
              <p className="max-w-[15rem] text-sm leading-6 text-[#8b7f6d]">
                {isSuggestionsLoading
                  ? "Looking up matching places..."
                  : "We use the selected place to build a standing-history dossier before Step 2."}
              </p>
              <button
                type="button"
                onClick={onContinueToLens}
                disabled={isSetupLoading || setupState.destinationInput.trim().length === 0}
                className="rounded-full bg-[#1f1a14] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#302921] disabled:opacity-60"
              >
                {isSetupLoading ? "Building dossier..." : "Continue"}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "step-2" && lensResult ? (
          <div className="flex min-h-full flex-col">
            <Breadcrumbs stage={stage} />

            <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                  Step 2 of 3 · Lens
                </p>
                <h2 className="mt-3 text-[2.25rem] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#1f1a14]">
                  Choose the surviving layer.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-[#6d6254]">
                  Only evidence-backed eras and interpretation lenses appear here. If coverage is weak, we show fewer options rather than filling gaps.
                </p>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                    Era lens
                  </p>
                  <p className="text-xs text-[#9b907f]">
                    {Math.round(lensResult.coverageConfidence * 100)}% coverage confidence
                  </p>
                </div>
                <div className="mt-3 grid gap-2">
                  {lensResult.eligibleEras.map((era) => (
                    <SelectionChip
                      key={era.id}
                      active={setupState.selectedEra === era.id}
                      label={ERA_LENS_META[era.id as keyof typeof ERA_LENS_META].label}
                      helper={ERA_LENS_META[era.id as keyof typeof ERA_LENS_META].rangeLabel}
                      onClick={() => onSelectEra(era.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                  Interpretation lens
                </p>
                <div className="mt-3 grid gap-2">
                  {lensResult.eligibleInterpretationLenses.map((lens) => (
                    <SelectionChip
                      key={lens.id}
                      active={setupState.selectedInterpretationLens === lens.id}
                      label={INTERPRETATION_LENS_META[lens.id as keyof typeof INTERPRETATION_LENS_META].label}
                      helper={INTERPRETATION_LENS_META[lens.id as keyof typeof INTERPRETATION_LENS_META].description}
                      onClick={() => onSelectInterpretationLens(lens.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                  Pace
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {paceOptions.map((pace) => (
                    <button
                      key={pace}
                      type="button"
                      onClick={() => onSelectPace(pace)}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                        setupState.pace === pace
                          ? "border-[rgba(132,100,61,0.18)] bg-[#f6efe4] text-[#221e18]"
                          : "border-[rgba(116,102,82,0.08)] bg-white text-[#6d6254] hover:bg-[#faf7f2]"
                      }`}
                    >
                      {pace}
                    </button>
                  ))}
                </div>
              </div>

              {lensResult.warnings.length > 0 || statusMessage ? (
                <div className="mt-6 rounded-[22px] border border-[rgba(132,100,61,0.12)] bg-[#faf4ea] px-4 py-4 text-sm leading-6 text-[#6f624f]">
                  {statusMessage ?? lensResult.warnings[0]}
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[rgba(116,102,82,0.08)] pt-5">
              <button
                type="button"
                onClick={onBackToDestination}
                className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-3 text-sm font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onGenerateStory}
                disabled={
                  isStoryLoading ||
                  !setupState.selectedEra ||
                  !setupState.selectedInterpretationLens
                }
                className="rounded-full bg-[#1f1a14] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#302921] disabled:opacity-60"
              >
                {isStoryLoading ? "Generating..." : "Generate story"}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "step-3" && story && narrative ? (
          <div className="flex min-h-full flex-col">
            <Breadcrumbs stage={stage} />

            <div className="mx-auto w-full max-w-[390px] flex-1">
              <div className="pt-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                  Step 3 of 3 · Story
                </p>
                <h2 className="mt-3 text-[2.15rem] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#1f1a14]">
                  {narrative.title}
                </h2>
                <p className="mt-3 text-[15px] leading-7 text-[#6d6254]">{narrative.subtitle}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <MetricCard value={String(narrative.chapters.length).padStart(2, "0")} label="Stops" />
                <MetricCard value={narrative.spanLabel ?? "Span"} label="Span" />
                <MetricCard value={`${narrative.readMinutes ?? 8} min`} label="Read" />
                <MetricCard value={`${narrative.walkKilometers ?? 8} km`} label="Walk" />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {(["info", "stops", "notes"] as StoryTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onSelectStoryTab(tab)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                      storyTab === tab
                        ? "bg-[#1f1a14] text-white"
                        : "bg-[#f3eee5] text-[#6d6254] hover:bg-[#eee7dc]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {storyTab === "info" && activeChapter ? (
                <div className="mt-5 rounded-[26px] border border-[rgba(116,102,82,0.08)] bg-white px-5 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                    Focus stop
                  </p>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-extrabold tracking-[-0.03em] text-[#1f1a14]">
                        {activeChapter.title}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#8f8374]">
                        {activeChapter.dateLabel}
                      </p>
                    </div>
                    {hasMultipleDays && activePlace ? (
                      <span className="rounded-full bg-[#f4ede2] px-3 py-1 text-xs font-semibold text-[#6f624f]">
                        Day {activePlace.day}
                      </span>
                    ) : null}
                  </div>
                  {activePlace?.image ? (
                    <div
                      aria-label={activePlace.title}
                      role="img"
                      className="mt-4 h-40 w-full rounded-[20px] bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(18, 24, 32, 0.08), rgba(18, 24, 32, 0.18)), url("${activePlace.image.thumbUrl}")`,
                      }}
                    />
                  ) : null}
                  <p className="mt-4 text-sm leading-6 text-[#655b4e]">{activeChapter.summary}</p>
                  <p className="mt-4 text-sm leading-6 text-[#776c5d]">{story.whyThisRouteWorks}</p>
                  {activePlace?.evidenceUrls.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activePlace.evidenceUrls.slice(0, 3).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-[#f7f3ec] px-3 py-1 text-xs font-semibold text-[#7c6f5f]"
                        >
                          Source
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {storyTab === "stops" ? (
                <div className="mt-5 grid gap-3">
                  {narrative.chapters.map((chapter, index) => {
                    const place = story.places.find((item) => item.id === chapter.placeId);

                    return (
                      <button
                        key={chapter.id}
                        type="button"
                        onClick={() => onSelectChapterIndex(index)}
                        className={`rounded-[24px] border px-4 py-4 text-left transition-colors ${
                          activeChapterIndex === index
                            ? "border-[rgba(132,100,61,0.18)] bg-[#f6efe4]"
                            : "border-[rgba(116,102,82,0.08)] bg-white hover:bg-[#faf7f2]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#221e18]">
                              {String(index + 1).padStart(2, "0")} · {chapter.title}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8f8374]">
                              {chapter.dateLabel}
                            </p>
                          </div>
                          {hasMultipleDays && place ? (
                            <span className="rounded-full bg-[#f4ede2] px-3 py-1 text-xs font-semibold text-[#6f624f]">
                              Day {place.day}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#6d6254]">{chapter.summary}</p>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {storyTab === "notes" ? (
                <div className="mt-5">
                  <textarea
                    value={currentJourney?.notes ?? ""}
                    onChange={(event) => onUpdateNotes(event.target.value)}
                    placeholder="Add notes, edits, or manual curation notes"
                    className="min-h-[240px] w-full rounded-[24px] border border-[rgba(116,102,82,0.1)] bg-white px-4 py-4 text-sm text-[#221e18] outline-none placeholder:text-[#aaa08f] focus:border-[rgba(132,100,61,0.22)]"
                  />
                </div>
              ) : null}

              {(story.warnings.length > 0 || statusMessage) ? (
                <div className="mt-5 rounded-[22px] border border-[rgba(132,100,61,0.12)] bg-[#faf4ea] px-4 py-4 text-sm leading-6 text-[#6f624f]">
                  {statusMessage ?? story.warnings[0]}
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[rgba(116,102,82,0.08)] pt-5">
              <button
                type="button"
                onClick={onBackToLens}
                className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-3 text-sm font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onEndJourney}
                className="rounded-full bg-[#1f1a14] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#302921]"
              >
                End story
              </button>
            </div>
          </div>
        ) : null}

        {stage === "summary" && currentJourney ? (
          <div className="mx-auto flex min-h-full w-full max-w-[390px] flex-col justify-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                Summary
              </p>
              <h2 className="mt-3 text-[2.25rem] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#1f1a14]">
                {currentJourney.label}
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[#6d6254]">
                {currentJourney.story.endSummary}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <MetricCard value={currentJourney.destination.canonicalLabel} label="Place" />
              <MetricCard
                value={String(currentJourney.story.narrative.chapters.length).padStart(2, "0")}
                label="Stops"
              />
              <MetricCard value={currentJourney.story.narrative.spanLabel ?? "Span"} label="Span" />
              <MetricCard value={currentJourney.setup.tripLength} label="Length" />
            </div>

            {exportMessage ? (
              <p className="mt-5 text-sm leading-6 text-[#7b6f5f]">{exportMessage}</p>
            ) : null}

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={onExportMap}
                disabled={isExporting}
                className="rounded-full bg-[#1f1a14] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#302921] disabled:opacity-60"
              >
                {isExporting ? "Exporting..." : "Export map"}
              </button>
              <button
                type="button"
                onClick={onGoHome}
                className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-3 text-sm font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
              >
                Home
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
