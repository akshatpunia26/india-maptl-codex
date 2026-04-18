import {
  LensesGenerationResult,
  NormalizedPlaceCandidate,
  SiteImage,
} from "@/lib/history/types";
import { EraLensId, InterpretationLensId } from "@/lib/history/taxonomy";
import { MarkerIconKey, NarrativeResult, Place } from "@/lib/mock/types";

export type AppStage = "intro" | "step-1" | "step-2" | "step-3" | "summary";
export type StoryTab = "info" | "stops" | "notes";

export interface SetupState {
  destinationInput: string;
  selectedPlace: NormalizedPlaceCandidate | null;
  tripLength: string;
  selectedEra: EraLensId | null;
  selectedInterpretationLens: InterpretationLensId | null;
  pace: string;
}

export interface MapDestination extends NormalizedPlaceCandidate {
  bounds: [[number, number], [number, number]];
  zoom: number;
}

export interface StoryPlace extends Place {
  day: number;
  markerLabel?: string;
  markerIcon?: MarkerIconKey;
  image: SiteImage | null;
  evidenceUrls: string[];
  areaLabel: string;
  whyItMatters: string;
  standingStatus: string;
  chronologyLabel: string;
}

export interface StoryPayload {
  dossierKey: string;
  overview: string;
  endSummary: string;
  exportTitle: string;
  destination: MapDestination;
  places: StoryPlace[];
  narrative: NarrativeResult;
  selectedEra: EraLensId;
  selectedInterpretationLens: InterpretationLensId;
  whyThisRouteWorks: string;
  transitionLogic: string;
  warnings: string[];
  coverageConfidence: number;
}

export interface SavedJourney {
  id: string;
  label: string;
  setup: SetupState;
  destination: MapDestination;
  dossierKey: string;
  lensResult: LensesGenerationResult;
  story: StoryPayload;
  notes: string;
  status: "active" | "ended";
  createdAt: string;
  endedAt?: string;
}

export interface PersistedJourneyState {
  version: number;
  stage: AppStage;
  setupState: SetupState;
  destination: MapDestination | null;
  dossierKey: string | null;
  lensResult: LensesGenerationResult | null;
  savedJourneys: SavedJourney[];
  selectedJourneyId: string;
  activeChapterIndex: number;
  storyTab: StoryTab;
}
