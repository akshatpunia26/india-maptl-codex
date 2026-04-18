"use client";

import { AnimatePresence, motion, type Transition } from "framer-motion";
import { useState } from "react";

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
  onContinueToLens: () => void;
  onGenerateStory: () => void;
  onBackToDestination: () => void;
  onBackToLens: () => void;
  onSelectStoryTab: (tab: StoryTab) => void;
  askQuestion: string;
  askAnswer: string | null;
  isAskLoading: boolean;
  onChangeQuestion: (value: string) => void;
  onAskQuestion: () => void;
  onSelectChapterIndex: (index: number) => void;
  onEndJourney: () => void;
  onExportMap: () => void;
  onDownloadStory: () => void;
  onGoHome: () => void;
}

const tripLengths = ["Half day", "1 day", "Weekend", "Multi day"];

const stepEnter = { opacity: 0, y: 10 };
const stepAnimate = { opacity: 1, y: 0 };
const stepExit = { opacity: 0, y: -8 };
const stepTransition: Transition = { duration: 0.22, ease: "easeOut" };

function Breadcrumbs({ stage }: { stage: AppStage }) {
  const steps = [
    { id: "step-1", label: "Journey" },
    { id: "step-2", label: "Lens" },
    { id: "step-3", label: "Story" },
  ] as const;

  const activeIdx = steps.findIndex((s) => s.id === stage);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isActive = stage === step.id;
        const isDone = i < activeIdx;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 ${isActive ? "text-[#1f1a14]" : isDone ? "text-[#84643d]" : "text-[#c5bbac]"}`}>
              <span
                className={`block h-[5px] w-[5px] rounded-full transition-colors ${
                  isActive ? "bg-[#1f1a14]" : isDone ? "bg-[#84643d]" : "bg-[#d4ccc0]"
                }`}
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em]">
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span className="text-[10px] text-[#d4ccc0]">/</span>
            ) : null}
          </div>
        );
      })}
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
      className={`rounded-[16px] border px-3.5 py-2.5 text-left transition-all ${
        active
          ? "border-[rgba(132,100,61,0.22)] bg-[#f6efe4] shadow-[0_0_0_1px_rgba(132,100,61,0.08)]"
          : "border-[rgba(116,102,82,0.09)] bg-white hover:bg-[#faf7f2] hover:border-[rgba(116,102,82,0.16)]"
      }`}
    >
      <p className="text-[13px] font-semibold text-[#221e18]">{label}</p>
      {helper ? <p className="mt-0.5 text-[11.5px] leading-[1.6] text-[#7a6f61]">{helper}</p> : null}
    </button>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-[14px] border border-[rgba(116,102,82,0.08)] bg-[#fbf8f3] px-2.5 py-2">
      <p className="text-[1rem] font-extrabold tracking-[-0.03em] text-[#201d17] leading-none">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.13em] text-[#8c7f6e]">{label}</p>
    </div>
  );
}

function SectionLabel({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="info-group relative flex items-center gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f8374]">
        {children}
      </p>
      {tooltip ? (
        <>
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full bg-[#ede8e0] text-[9px] font-bold text-[#8f8374] leading-none"
          >
            ?
          </button>
          <div className="info-tooltip absolute left-0 top-6 z-20 w-60 rounded-[12px] border border-[rgba(116,102,82,0.12)] bg-white px-3 py-2.5 text-[11.5px] leading-[1.6] text-[#6d6254] shadow-[0_8px_24px_rgba(68,55,39,0.1)]">
            {tooltip}
          </div>
        </>
      ) : null}
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
  onSelectTripLength,
  onSelectEra,
  onSelectInterpretationLens,
  onContinueToLens,
  onGenerateStory,
  onBackToDestination,
  onBackToLens,
  onSelectStoryTab,
  askQuestion,
  askAnswer,
  isAskLoading,
  onChangeQuestion,
  onAskQuestion,
  onSelectChapterIndex,
  onEndJourney,
  onExportMap,
  onDownloadStory,
  onGoHome,
}: LeftRailProps) {
  const [lensSubStep, setLensSubStep] = useState<"era" | "interpretation">("era");

  const story = currentJourney?.story ?? null;
  const narrative = story?.narrative ?? null;
  const hasMultipleDays = Boolean(story?.places.some((place) => place.day > 1));
  const eraInterpretationOptions =
    (setupState.selectedEra && lensResult?.interpretationLensesByEra?.[setupState.selectedEra]) ||
    lensResult?.eligibleInterpretationLenses ||
    [];

  return (
    <aside className="panel-surface min-h-0 rounded-[28px]">
      <div className="scrollbar-hidden flex h-full flex-col overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait" initial={false}>

          {/* ── Intro ── */}
          {stage === "intro" ? (
            <motion.div
              key="intro"
              initial={stepEnter}
              animate={stepAnimate}
              exit={stepExit}
              transition={stepTransition}
              className="mx-auto flex min-h-full w-full max-w-[360px] flex-col justify-center"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89b8a]">
                  India · Standing history
                </p>
                <h1 className="mt-3 text-[2.4rem] font-extrabold leading-[0.95] tracking-[-0.07em] text-[#1f1a14]">
                  Start with a city.
                </h1>
                <div
                  className="mt-4 h-32 w-full rounded-[20px] border border-[rgba(116,102,82,0.1)] bg-cover bg-center"
                  style={{ backgroundImage: "linear-gradient(180deg, rgba(20,18,16,0.06), rgba(20,18,16,0.25)), url('https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=80')" }}
                />
                <p className="mt-4 text-[14px] leading-[1.75] text-[#6d6254]">
                  Pick any Indian city. We surface only the surviving historical layers, then generate a walking route grounded in what still stands.
                </p>
              </div>
              <div className="mt-7">
                <button
                  type="button"
                  onClick={onStart}
                  className="rounded-full bg-[#1f1a14] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#302921]"
                >
                  Get started
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* ── Step 1 · Journey ── */}
          {stage === "step-1" ? (
            <motion.div
              key="step-1"
              initial={stepEnter}
              animate={stepAnimate}
              exit={stepExit}
              transition={stepTransition}
              className="flex min-h-full flex-col"
            >
              <Breadcrumbs stage={stage} />

              <div className="mx-auto flex w-full flex-1 flex-col justify-center pt-4">
                <div>
                  <h2 className="text-[2rem] font-extrabold leading-[0.97] tracking-[-0.06em] text-[#1f1a14]">
                    Pick your city.
                  </h2>
                  <p className="mt-3 text-[13.5px] leading-[1.75] text-[#6d6254]">
                    Any city, town, or locality in India. We resolve the map first, then surface only evidence-backed historical layers.
                  </p>
                </div>

                {/* Destination input */}
                <div className="mt-6">
                  <SectionLabel>Destination</SectionLabel>
                  <input
                    value={setupState.destinationInput}
                    onChange={(event) => onDestinationInput(event.target.value)}
                    placeholder="Search a city or locality…"
                    className="mt-2 w-full rounded-[18px] border-2 border-[rgba(116,102,82,0.12)] bg-white px-4 py-3 text-[14px] font-semibold text-[#1f1a14] outline-none transition-all placeholder:font-normal placeholder:text-[#b0a898] focus:border-[rgba(132,100,61,0.28)] focus:shadow-[0_0_0_4px_rgba(132,100,61,0.06)]"
                  />
                </div>

                {/* Place candidates — visually distinct from input */}
                {placeCandidates.length > 0 ? (
                  <div className="mt-2 overflow-hidden rounded-[16px] border border-[rgba(116,102,82,0.1)] bg-white shadow-[0_4px_16px_rgba(68,55,39,0.08)]">
                    {placeCandidates.map((candidate, i) => (
                      <button
                        key={candidate.mapboxId}
                        type="button"
                        onClick={() => onSelectPlaceCandidate(candidate)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#faf7f2] ${
                          setupState.selectedPlace?.mapboxId === candidate.mapboxId
                            ? "bg-[#f6efe4]"
                            : ""
                        } ${i > 0 ? "border-t border-[rgba(116,102,82,0.07)]" : ""}`}
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f0ebe3] text-[10px] font-bold text-[#84643d]">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-[#221e18]">{candidate.canonicalLabel}</p>
                          <p className="text-[11.5px] leading-[1.5] text-[#8b7e6e]">{candidate.displayContext}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : isSuggestionsLoading ? (
                  <div className="mt-2 flex items-center gap-2 px-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#c5bbac] [animation:pulseDot_1.2s_ease-in-out_infinite]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-[#c5bbac] [animation:pulseDot_1.2s_ease-in-out_0.3s_infinite]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-[#c5bbac] [animation:pulseDot_1.2s_ease-in-out_0.6s_infinite]" />
                    <p className="text-[12px] text-[#a99a87]">Looking up places…</p>
                  </div>
                ) : null}

                {/* Trip length */}
                <div className="mt-6">
                  <SectionLabel>Trip length</SectionLabel>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {tripLengths.map((length) => (
                      <button
                        key={length}
                        type="button"
                        onClick={() => onSelectTripLength(length)}
                        className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                          setupState.tripLength === length
                            ? "border-[rgba(132,100,61,0.2)] bg-[#f6efe4] text-[#221e18]"
                            : "border-[rgba(116,102,82,0.09)] bg-white text-[#6d6254] hover:bg-[#faf7f2]"
                        }`}
                      >
                        {length}
                      </button>
                    ))}
                  </div>
                </div>

                {statusMessage ? (
                  <div className="mt-5 rounded-[16px] border border-[rgba(132,100,61,0.12)] bg-[#faf4ea] px-4 py-3 text-[12.5px] leading-[1.65] text-[#6f624f]">
                    {statusMessage}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-[rgba(116,102,82,0.07)] pt-4">
                <p className="text-[11.5px] leading-[1.6] text-[#9a8f80]">
                  {isSuggestionsLoading
                    ? "Resolving matching places…"
                    : "A standing-history dossier is built in Step 2."}
                </p>
                <button
                  type="button"
                  onClick={onContinueToLens}
                  disabled={isSetupLoading || setupState.destinationInput.trim().length === 0}
                  className="shrink-0 rounded-full bg-[#1f1a14] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#302921] disabled:opacity-50"
                >
                  {isSetupLoading ? "Building…" : "Continue →"}
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* ── Step 2a · Era ── */}
          {stage === "step-2" && lensResult && lensSubStep === "era" ? (
            <motion.div
              key="step-2-era"
              initial={stepEnter}
              animate={stepAnimate}
              exit={stepExit}
              transition={stepTransition}
              className="flex min-h-full flex-col"
            >
              <Breadcrumbs stage={stage} />

              <div className="mx-auto flex w-full flex-1 flex-col justify-center pt-4">
                <div>
                  <h2 className="text-[1.9rem] font-extrabold leading-[0.97] tracking-[-0.06em] text-[#1f1a14]">
                    Choose an era.
                  </h2>
                  <p className="mt-2.5 text-[13.5px] leading-[1.75] text-[#6d6254]">
                    Only eras with surviving evidence appear.{" "}
                    <span className="font-semibold text-[#84643d]">
                      {Math.round(lensResult.coverageConfidence * 100)}% coverage
                    </span>{" "}
                    for this city.
                  </p>
                </div>

                <div className="mt-6">
                  <SectionLabel tooltip="Historical periods with documented surviving structures in this city. Eras with weak evidence are excluded.">
                    Era
                  </SectionLabel>
                  <div className="mt-2.5 grid gap-2">
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

                {lensResult.warnings.length > 0 || statusMessage ? (
                  <div className="mt-4 rounded-[14px] border border-[rgba(132,100,61,0.12)] bg-[#faf4ea] px-4 py-3 text-[12.5px] leading-[1.65] text-[#6f624f]">
                    {statusMessage ?? lensResult.warnings[0]}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-[rgba(116,102,82,0.07)] pt-4">
                <button
                  type="button"
                  onClick={onBackToDestination}
                  className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setLensSubStep("interpretation")}
                  disabled={!setupState.selectedEra}
                  className="rounded-full bg-[#1f1a14] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#302921] disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* ── Step 2b · Interpretation ── */}
          {stage === "step-2" && lensResult && lensSubStep === "interpretation" ? (
            <motion.div
              key="step-2-interpretation"
              initial={stepEnter}
              animate={stepAnimate}
              exit={stepExit}
              transition={stepTransition}
              className="flex min-h-full flex-col"
            >
              <Breadcrumbs stage={stage} />

              <div className="mx-auto flex w-full flex-1 flex-col justify-center pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a89b8a]">
                    {setupState.selectedEra ? ERA_LENS_META[setupState.selectedEra as keyof typeof ERA_LENS_META]?.label : "Selected era"}
                  </p>
                  <h2 className="mt-1.5 text-[1.9rem] font-extrabold leading-[0.97] tracking-[-0.06em] text-[#1f1a14]">
                    How to explore it.
                  </h2>
                  <p className="mt-2.5 text-[13.5px] leading-[1.75] text-[#6d6254]">
                    Each lens focuses on a different surviving thread from this era.
                  </p>
                </div>

                <div className="mt-5">
                  <SectionLabel tooltip="The thematic angle applied to site selection and narrative. Determines which surviving structures qualify as stops.">
                    Interpretation
                  </SectionLabel>
                  <div className="mt-2.5 grid gap-2">
                    {eraInterpretationOptions.map((lens) => (
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

                {statusMessage ? (
                  <div className="mt-4 rounded-[14px] border border-[rgba(132,100,61,0.12)] bg-[#faf4ea] px-4 py-3 text-[12.5px] leading-[1.65] text-[#6f624f]">
                    {statusMessage}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-[rgba(116,102,82,0.07)] pt-4">
                <button
                  type="button"
                  onClick={() => setLensSubStep("era")}
                  className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={onGenerateStory}
                  disabled={isStoryLoading || !setupState.selectedInterpretationLens}
                  className="relative overflow-hidden rounded-full bg-[#1f1a14] px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#302921] disabled:opacity-50"
                >
                  {isStoryLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generating…
                    </span>
                  ) : (
                    "Generate story →"
                  )}
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* ── Step 3 · Story ── */}
          {stage === "step-3" && story && narrative ? (
            <motion.div
              key="step-3"
              initial={stepEnter}
              animate={stepAnimate}
              exit={stepExit}
              transition={stepTransition}
              className="flex min-h-full flex-col"
            >
              <Breadcrumbs stage={stage} />

              <div className="mx-auto w-full flex-1 pt-4">
                <div>
                  <h2 className="text-[1.85rem] font-extrabold leading-[0.97] tracking-[-0.055em] text-[#1f1a14]">
                    {narrative.title}
                  </h2>
                  <p className="mt-2 text-[13.5px] leading-[1.7] text-[#6d6254]">{narrative.subtitle}</p>
                </div>

                <div className="mt-3 flex gap-2">
                  <StatPill value={String(narrative.chapters.length).padStart(2, "0")} label="Stops" />
                  <StatPill value={narrative.spanLabel ?? "—"} label="Span" />
                  <StatPill value={`${narrative.readMinutes ?? 8}m`} label="Read" />
                  <StatPill value={`${narrative.walkKilometers ?? 8}km`} label="Walk" />
                </div>

                {/* Tabs */}
                <div className="mt-4 flex gap-1.5">
                  {(["stops", "ask"] as StoryTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => onSelectStoryTab(tab)}
                      className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold capitalize transition-colors ${
                        storyTab === tab
                          ? "bg-[#1f1a14] text-white"
                          : "bg-[#f3eee5] text-[#6d6254] hover:bg-[#eee7dc]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Stops tab */}
                {storyTab === "stops" ? (
                  <div className="mt-4 grid gap-2">
                    {narrative.chapters.map((chapter, index) => {
                      const place = story.places.find((item) => item.id === chapter.placeId);

                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => onSelectChapterIndex(index)}
                          className={`rounded-[18px] border px-3.5 py-3.5 text-left transition-all ${
                            activeChapterIndex === index
                              ? "border-[rgba(132,100,61,0.2)] bg-[#f6efe4]"
                              : "border-[rgba(116,102,82,0.08)] bg-white hover:bg-[#faf7f2]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[12.5px] font-semibold text-[#221e18]">
                                {String(index + 1).padStart(2, "0")} · {chapter.title}
                              </p>
                              <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.14em] text-[#8f8374]">
                                {chapter.dateLabel}
                              </p>
                            </div>
                            {hasMultipleDays && place ? (
                              <span className="shrink-0 rounded-full bg-[#f4ede2] px-2.5 py-1 text-[11px] font-semibold text-[#6f624f]">
                                Day {place.day}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-[12.5px] leading-[1.65] text-[#6d6254]">{chapter.summary}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {storyTab === "ask" ? (
                  <div className="mt-4 rounded-[20px] border border-[rgba(116,102,82,0.08)] bg-white px-4 py-4">
                    <p className="text-[15px] font-bold tracking-[-0.02em] text-[#1f1a14]">Ask about this walk</p>
                    <textarea
                      value={askQuestion}
                      onChange={(event) => onChangeQuestion(event.target.value)}
                      placeholder="Ask about this place, this era, or this full route…"
                      className="mt-3 min-h-[90px] w-full rounded-[14px] border border-[rgba(116,102,82,0.1)] bg-[#fcfaf7] px-3 py-2.5 text-[13px] text-[#221e18] outline-none placeholder:text-[#b0a898]"
                    />
                    <button
                      type="button"
                      onClick={onAskQuestion}
                      disabled={isAskLoading || askQuestion.trim().length < 8}
                      className="mt-3 rounded-full bg-[#1f1a14] px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
                    >
                      {isAskLoading ? "Thinking…" : "Ask question"}
                    </button>
                    {askAnswer ? <p className="mt-3 text-[12.5px] leading-[1.7] text-[#655b4e]">{askAnswer}</p> : null}
                  </div>
                ) : null}

                {(story.warnings.length > 0 || statusMessage) ? (
                  <div className="mt-4 rounded-[14px] border border-[rgba(132,100,61,0.12)] bg-[#faf4ea] px-4 py-3 text-[12.5px] leading-[1.65] text-[#6f624f]">
                    {statusMessage ?? story.warnings[0]}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[rgba(116,102,82,0.07)] pt-4">
                <button
                  type="button"
                  onClick={onBackToLens}
                  className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={onEndJourney}
                  className="rounded-full bg-[#1f1a14] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#302921]"
                >
                  End story
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* ── Summary ── */}
          {stage === "summary" && currentJourney ? (
            <motion.div
              key="summary"
              initial={stepEnter}
              animate={stepAnimate}
              exit={stepExit}
              transition={stepTransition}
              className="mx-auto flex min-h-full w-full max-w-[360px] flex-col justify-center"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89b8a]">
                  Journey complete
                </p>
                <h2 className="mt-2.5 text-[2rem] font-extrabold leading-[0.97] tracking-[-0.055em] text-[#1f1a14]">
                  {currentJourney.label}
                </h2>
                <p className="mt-3 text-[13.5px] leading-[1.75] text-[#6d6254]">
                  {currentJourney.story.endSummary}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <StatPill
                  value={String(currentJourney.story.narrative.chapters.length).padStart(2, "0")}
                  label="Stops"
                />
                <StatPill value={currentJourney.story.narrative.spanLabel ?? "—"} label="Span" />
                <StatPill value={currentJourney.setup.tripLength} label="Length" />
              </div>

              {exportMessage ? (
                <p className="mt-4 text-[12.5px] leading-[1.65] text-[#7b6f5f]">{exportMessage}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onExportMap}
                  disabled={isExporting}
                  className="rounded-full bg-[#1f1a14] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#302921] disabled:opacity-50"
                >
                  {isExporting ? "Exporting…" : "Export map"}
                </button>
                <button
                  type="button"
                  onClick={onDownloadStory}
                  className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
                >
                  Home
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out my MapTL narrative: ${currentJourney.label}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
                >
                  Share WhatsApp
                </a>
                <a
                  href={`https://www.instagram.com/`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[rgba(116,102,82,0.1)] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3e372d] transition-colors hover:bg-[#faf7f2]"
                >
                  Share Instagram
                </a>
              </div>
            </motion.div>
          ) : null}

        </AnimatePresence>
      </div>
    </aside>
  );
}
