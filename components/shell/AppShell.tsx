"use client";

import { toPng } from "html-to-image";
import Image from "next/image";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { LeftRail } from "@/components/panels/LeftRail";
import { RightPanel } from "@/components/panels/RightPanel";
import {
  FeasibleStop,
  LensesGenerationResult,
  NormalizedPlaceCandidate,
  TimelineGenerationResult,
} from "@/lib/history/types";
import { buildStoryPayload } from "@/lib/journey/story";
import { loadPersistedJourneyState, savePersistedJourneyState } from "@/lib/journey/storage";
import {
  AppStage,
  MapDestination,
  PersistedJourneyState,
  SavedJourney,
  SetupState,
  StoryPayload,
  StoryTab,
} from "@/lib/journey/types";
import { toMapDestination } from "@/lib/utils/map";

function getDefaultSetupState(): SetupState {
  return {
    destinationInput: "",
    selectedPlace: null,
    tripLength: "1 day",
    selectedEra: null,
    selectedInterpretationLens: null,
    pace: "Balanced",
  };
}

async function requestJson<TResponse>(input: RequestInfo, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : `Request failed: ${response.status}`,
    );
  }

  return payload as TResponse;
}

function dedupeJourneys(journeys: SavedJourney[]) {
  const seen = new Set<string>();

  return journeys.filter((journey) => {
    if (seen.has(journey.id)) {
      return false;
    }

    seen.add(journey.id);
    return true;
  });
}

export function AppShell() {
  const mapCaptureRef = useRef<HTMLDivElement | null>(null);

  const [stage, setStage] = useState<AppStage>("intro");
  const [setupState, setSetupState] = useState<SetupState>(getDefaultSetupState);
  const [placeCandidates, setPlaceCandidates] = useState<NormalizedPlaceCandidate[]>([]);
  const [destination, setDestination] = useState<MapDestination | null>(null);
  const [dossierKey, setDossierKey] = useState<string | null>(null);
  const [lensResult, setLensResult] = useState<LensesGenerationResult | null>(null);
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState("");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [storyTab, setStoryTab] = useState<StoryTab>("info");
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const destinationQuery = setupState.destinationInput.trim();
  const visiblePlaceCandidates = destinationQuery.length >= 2 ? placeCandidates : [];

  const currentJourney = useMemo(
    () => savedJourneys.find((journey) => journey.id === selectedJourneyId) ?? null,
    [savedJourneys, selectedJourneyId],
  );
  const currentStory: StoryPayload | null = currentJourney?.story ?? null;
  const chapterCount = currentJourney?.story.narrative.chapters.length ?? 0;
  const resolvedChapterIndex = chapterCount > 0 ? Math.min(activeChapterIndex, chapterCount - 1) : 0;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const persisted = loadPersistedJourneyState();

      if (persisted) {
        const journeys = dedupeJourneys(persisted.savedJourneys ?? []);
        const selected = journeys.find((journey) => journey.id === persisted.selectedJourneyId) ?? null;

        setSavedJourneys(journeys);
        setSetupState(persisted.setupState ?? getDefaultSetupState());
        setDestination(persisted.destination ?? null);
        setDossierKey(persisted.dossierKey ?? null);
        setLensResult(persisted.lensResult ?? null);
        setSelectedJourneyId(selected?.id ?? "");
        setActiveChapterIndex(persisted.activeChapterIndex ?? 0);
        setStoryTab(persisted.storyTab ?? "info");
        setStage(persisted.stage ?? "intro");
      }

      setIsHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || stage !== "step-1") {
      return;
    }

    const query = destinationQuery;
    if (query.length < 2) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSuggestionsLoading(true);
      try {
        const response = await requestJson<{ candidates: NormalizedPlaceCandidate[] }>(
          `/api/place/resolve?query=${encodeURIComponent(query)}`,
        );
        if (!cancelled) {
          setPlaceCandidates(response.candidates);
        }
      } catch {
        if (!cancelled) {
          setPlaceCandidates([]);
        }
      } finally {
        if (!cancelled) {
          setIsSuggestionsLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [destinationQuery, isHydrated, stage]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const persisted: PersistedJourneyState = {
      version: 2,
      stage,
      setupState,
      destination,
      dossierKey,
      lensResult,
      savedJourneys,
      selectedJourneyId,
      activeChapterIndex: resolvedChapterIndex,
      storyTab,
    };

    savePersistedJourneyState(persisted);
  }, [
    destination,
    dossierKey,
    isHydrated,
    lensResult,
    resolvedChapterIndex,
    savedJourneys,
    selectedJourneyId,
    setupState,
    stage,
    storyTab,
  ]);

  const applyJourneySelection = (journey: SavedJourney) => {
    setSelectedJourneyId(journey.id);
    setSetupState(journey.setup);
    setDestination(journey.destination);
    setDossierKey(journey.dossierKey);
    setLensResult(journey.lensResult);
    setActiveChapterIndex(0);
    setStoryTab("info");
    setIsMapFullscreen(false);
    setExportMessage(null);
    setStatusMessage(journey.story.warnings[0] ?? null);
    setStage(journey.status === "ended" ? "summary" : "step-3");
  };

  const resetDraft = (nextStage: AppStage) => {
    setStage(nextStage);
    setSetupState(getDefaultSetupState());
    setPlaceCandidates([]);
    setDestination(null);
    setDossierKey(null);
    setLensResult(null);
    setSelectedJourneyId("");
    setActiveChapterIndex(0);
    setStoryTab("info");
    setIsMapFullscreen(false);
    setStatusMessage(null);
    setExportMessage(null);
  };

  const handleContinueToLens = async () => {
    const query = setupState.destinationInput.trim();
    if (!query || isSetupLoading) {
      return;
    }

    setIsSetupLoading(true);
    setStatusMessage(null);

    try {
      const selectedPlace =
        setupState.selectedPlace ??
        placeCandidates[0] ??
        (
          await requestJson<{ candidates: NormalizedPlaceCandidate[] }>(
            `/api/place/resolve?query=${encodeURIComponent(query)}`,
          )
        ).candidates[0];

      if (!selectedPlace) {
        throw new Error("No matching place was found. Try a broader city name.");
      }

      const dossierResponse = await requestJson<{
        dossier: {
          key: string;
          place: NormalizedPlaceCandidate;
          coverageConfidence: number;
          warnings: string[];
        };
      }>("/api/dossier/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          place: selectedPlace,
        }),
      });

      const lensesResponse = await requestJson<
        { dossierKey: string } & LensesGenerationResult
      >("/api/lenses/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dossierKey: dossierResponse.dossier.key,
        }),
      });

      startTransition(() => {
        setSetupState((current) => ({
          ...current,
          destinationInput: dossierResponse.dossier.place.canonicalLabel,
          selectedPlace: dossierResponse.dossier.place,
          selectedEra: lensesResponse.recommendedDefaults.era ?? null,
          selectedInterpretationLens:
            lensesResponse.recommendedDefaults.interpretationLens ?? null,
        }));
        setPlaceCandidates([]);
        setDestination(toMapDestination(dossierResponse.dossier.place));
        setDossierKey(dossierResponse.dossier.key);
        setLensResult(lensesResponse);
        setStage("step-2");
        setStatusMessage(
          lensesResponse.warnings[0] ??
            dossierResponse.dossier.warnings[0] ??
            null,
        );
      });
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "We could not build a dossier for this place.",
      );
    } finally {
      setIsSetupLoading(false);
    }
  };

  const handleGenerateStory = async () => {
    if (
      !destination ||
      !dossierKey ||
      !lensResult ||
      !setupState.selectedEra ||
      !setupState.selectedInterpretationLens ||
      isStoryLoading
    ) {
      return;
    }

    setIsStoryLoading(true);
    setStatusMessage(null);
    setIsMapFullscreen(false);

    try {
      const result = await requestJson<{
        dossier: {
          key: string;
          place: NormalizedPlaceCandidate;
          coverageConfidence: number;
        };
        timeline: TimelineGenerationResult;
        feasibleStops: FeasibleStop[];
      }>("/api/timeline/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dossierKey,
          selectedEra: setupState.selectedEra,
          selectedInterpretationLens: setupState.selectedInterpretationLens,
          tripLength: setupState.tripLength,
          pace: setupState.pace,
        }),
      });

      const story = buildStoryPayload({
        dossierKey,
        destination: toMapDestination(result.dossier.place),
        feasibleStops: result.feasibleStops,
        timeline: result.timeline,
        selectedEra: setupState.selectedEra,
        selectedInterpretationLens: setupState.selectedInterpretationLens,
        coverageConfidence: result.dossier.coverageConfidence,
      });

      const nextJourney: SavedJourney = {
        id: currentJourney?.id ?? `journey-${Date.now()}`,
        label: story.narrative.title,
        setup: setupState,
        destination: story.destination,
        dossierKey,
        lensResult,
        story,
        notes: currentJourney?.notes ?? "",
        status: "active",
        createdAt: currentJourney?.createdAt ?? new Date().toISOString(),
      };

      startTransition(() => {
        setSavedJourneys((current) =>
          dedupeJourneys([
            nextJourney,
            ...current.filter((journey) => journey.id !== nextJourney.id),
          ]),
        );
        setSelectedJourneyId(nextJourney.id);
        setDestination(story.destination);
        setActiveChapterIndex(0);
        setStoryTab("info");
        setStatusMessage(story.warnings[0] ?? null);
        setStage("step-3");
      });
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "The timeline could not be generated for this lens.",
      );
    } finally {
      setIsStoryLoading(false);
    }
  };

  const handleExportMap = async () => {
    if (!currentJourney || !mapCaptureRef.current || isExporting) {
      return;
    }

    setIsExporting(true);
    setExportMessage(null);

    try {
      const dataUrl = await toPng(mapCaptureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f6f2ea",
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${currentJourney.story.exportTitle}.png`;
      link.click();

      setExportMessage("Map exported as a PNG.");
    } catch {
      setExportMessage("Export could not capture the map right now.");
    } finally {
      setIsExporting(false);
    }
  };

  const journeyOptions = useMemo(
    () =>
      dedupeJourneys(savedJourneys).map((journey) => ({
        id: journey.id,
        label: journey.status === "ended" ? `${journey.label} · ended` : journey.label,
      })),
    [savedJourneys],
  );

  return (
    <main className="h-[100dvh] overflow-hidden px-5 py-5 text-foreground">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-4">
        <header className="panel-soft flex items-center gap-6 rounded-[26px] px-6 py-4">
          <button
            type="button"
            onClick={() => resetDraft("intro")}
            className="flex items-center gap-4 text-left"
          >
            <Image
              src="/logo.png"
              alt="MapTL logo"
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
              priority
            />
            <div>
              <p className="text-[2rem] font-extrabold leading-none tracking-[-0.07em] text-[#1f1a14]">
                MapTL
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8374]">
                Standing history for Indian cities
              </p>
            </div>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8374]">
                Journeys
              </p>
            </div>

            <select
              value={selectedJourneyId}
              onChange={(event) => {
                const journeyId = event.target.value;
                const selected = savedJourneys.find((journey) => journey.id === journeyId);
                if (selected) {
                  applyJourneySelection(selected);
                }
              }}
              className="min-w-[280px] rounded-[16px] border border-[rgba(116,102,82,0.08)] bg-white px-4 py-2.5 text-sm text-[#5f564a] outline-none transition-colors focus:border-[rgba(132,100,61,0.18)]"
            >
              {journeyOptions.length === 0 ? (
                <option value="">No saved stories yet</option>
              ) : selectedJourneyId === "" ? (
                <option value="">Select a saved story</option>
              ) : null}
              {journeyOptions.map((journey) => (
                <option key={journey.id} value={journey.id}>
                  {journey.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => resetDraft("step-1")}
              className="rounded-full bg-[#1f1a14] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#302921]"
            >
              New
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(330px,30%)_minmax(0,70%)] gap-4">
          <LeftRail
            stage={stage}
            setupState={setupState}
            placeCandidates={visiblePlaceCandidates}
            lensResult={lensResult}
            currentJourney={currentJourney}
            storyTab={storyTab}
            activeChapterIndex={resolvedChapterIndex}
            isSuggestionsLoading={isSuggestionsLoading}
            isSetupLoading={isSetupLoading}
            isStoryLoading={isStoryLoading}
            isExporting={isExporting}
            statusMessage={statusMessage}
            exportMessage={exportMessage}
            onStart={() => resetDraft("step-1")}
            onDestinationInput={(value) => {
              setPlaceCandidates([]);
              setIsSuggestionsLoading(false);
              setSetupState((current) => ({
                ...current,
                destinationInput: value,
                selectedPlace:
                  current.selectedPlace?.canonicalLabel === value ? current.selectedPlace : null,
              }));
            }}
            onSelectPlaceCandidate={(candidate) => {
              setPlaceCandidates([]);
              setIsSuggestionsLoading(false);
              setSetupState((current) => ({
                ...current,
                destinationInput: candidate.canonicalLabel,
                selectedPlace: candidate,
              }));
            }}
            onApplySuggestion={(value) => {
              setPlaceCandidates([]);
              setIsSuggestionsLoading(false);
              setSetupState((current) => ({
                ...current,
                destinationInput: value,
                selectedPlace: null,
              }));
            }}
            onSelectTripLength={(tripLength) =>
              setSetupState((current) => ({
                ...current,
                tripLength,
              }))
            }
            onSelectEra={(selectedEra) =>
              setSetupState((current) => ({
                ...current,
                selectedEra: selectedEra as SetupState["selectedEra"],
              }))
            }
            onSelectInterpretationLens={(selectedInterpretationLens) =>
              setSetupState((current) => ({
                ...current,
                selectedInterpretationLens:
                  selectedInterpretationLens as SetupState["selectedInterpretationLens"],
              }))
            }
            onSelectPace={(pace) =>
              setSetupState((current) => ({
                ...current,
                pace,
              }))
            }
            onContinueToLens={handleContinueToLens}
            onGenerateStory={handleGenerateStory}
            onBackToDestination={() => {
              setStage("step-1");
              setIsMapFullscreen(false);
            }}
            onBackToLens={() => {
              setStage("step-2");
              setStoryTab("info");
              setIsMapFullscreen(false);
            }}
            onSelectStoryTab={setStoryTab}
            onUpdateNotes={(notes) => {
              if (!selectedJourneyId) {
                return;
              }

              setSavedJourneys((current) =>
                current.map((journey) =>
                  journey.id === selectedJourneyId
                    ? {
                        ...journey,
                        notes,
                      }
                    : journey,
                ),
              );
            }}
            onSelectChapterIndex={setActiveChapterIndex}
            onEndJourney={() => {
              if (!selectedJourneyId) {
                return;
              }

              setSavedJourneys((current) =>
                current.map((journey) =>
                  journey.id === selectedJourneyId
                    ? {
                        ...journey,
                        status: "ended",
                        endedAt: new Date().toISOString(),
                      }
                    : journey,
                ),
              );
              setIsMapFullscreen(false);
              setStage("summary");
            }}
            onExportMap={handleExportMap}
            onGoHome={() => resetDraft("intro")}
          />

          <RightPanel
            stage={stage}
            setupInput={setupState.destinationInput}
            destination={currentJourney?.destination ?? destination}
            story={currentStory}
            activeChapterIndex={resolvedChapterIndex}
            isSetupLoading={isSetupLoading}
            isStoryLoading={isStoryLoading}
            isMapFullscreen={isMapFullscreen}
            captureRef={mapCaptureRef}
            onSelectPlace={(placeId) => {
              const nextIndex =
                currentJourney?.story.narrative.chapters.findIndex(
                  (chapter) => chapter.placeId === placeId,
                ) ?? -1;

              if (nextIndex >= 0) {
                setActiveChapterIndex(nextIndex);
              }
            }}
            onSelectChapterIndex={setActiveChapterIndex}
            onToggleFullscreen={() => setIsMapFullscreen((current) => !current)}
          />
        </div>
      </div>
    </main>
  );
}
