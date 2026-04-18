import { EraLensId, InterpretationLensId } from "@/lib/history/taxonomy";

export type StandingStatus = "standing" | "partial" | "trace" | "lost-supporting";
export type SiteType =
  | "temple"
  | "mosque"
  | "dargah"
  | "fort"
  | "palace"
  | "gate"
  | "stepwell"
  | "tank"
  | "bazaar"
  | "street"
  | "cemetery"
  | "tomb"
  | "civic-building"
  | "memorial"
  | "museum"
  | "bridge"
  | "railway"
  | "garden"
  | "waterfront"
  | "neighborhood-trace"
  | "other";

export type CoordSource = "wikidata" | "wikimedia" | "mapbox-search" | "manual";
export type CoordConfidence = "high" | "medium" | "low";
export type SourceQuality = "high" | "medium" | "low";

export interface NormalizedPlaceCandidate {
  label: string;
  canonicalLabel: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  placeType: string;
  mapboxId: string;
  displayContext: string;
}

export interface SourceEvidence {
  url: string;
  title: string;
  publisher: string;
  kind: "official" | "museum" | "wikimedia" | "encyclopedic" | "other";
  quality: SourceQuality;
}

export interface SiteImage {
  url: string;
  thumbUrl: string;
  sourcePage: string;
  attribution: string;
  license: string;
  width: number;
  height: number;
  imageConfidence: number;
}

export interface CandidateSite {
  id: string;
  title: string;
  altNames: string[];
  shortLabel: string;
  lat: number;
  lng: number;
  coordSource: CoordSource;
  coordConfidence: number;
  standingStatus: StandingStatus;
  siteType: SiteType;
  areaLabel: string;
  eraStart: number;
  eraEnd: number;
  eraLabels: EraLensId[];
  interpretationTags: InterpretationLensId[];
  visitEstimateMin: number;
  historicalSummary: string;
  whyItMatters: string;
  evidenceUrls: string[];
  sourceQuality: number;
  image: SiteImage | null;
  storyworthyScore: number;
  mappableScore: number;
  imageScore: number;
  chronologyScore: number;
  routeFitScore: number;
  wikidataId?: string;
  wikipediaTitle?: string;
}

export interface LensScore {
  id: EraLensId | InterpretationLensId;
  label: string;
  score: number;
  avgConfidence: number;
  supportingSiteIds: string[];
  routeFeasibility: number;
  narrativeUsefulness: number;
}

export interface CityDossier {
  key: string;
  builtAt: string;
  place: NormalizedPlaceCandidate;
  coverageConfidence: number;
  candidateSites: CandidateSite[];
  sourceEvidence: SourceEvidence[];
  eligibleEraScores: Record<EraLensId, number>;
  eligibleInterpretationLensScores: Record<InterpretationLensId, number>;
  imageCandidates: Array<{ siteId: string; image: SiteImage }>;
  warnings: string[];
}

export interface LensesGenerationResult {
  eligibleEras: LensScore[];
  eligibleInterpretationLenses: LensScore[];
  recommendedDefaults: {
    era?: EraLensId;
    interpretationLens?: InterpretationLensId;
  };
  coverageConfidence: number;
  warnings: string[];
}

export interface TimelineRequestInput {
  dossierKey: string;
  selectedEra: EraLensId;
  selectedInterpretationLens: InterpretationLensId;
  tripLength: string;
  pace: string;
}

export interface FeasibleStop {
  id: string;
  title: string;
  shortLabel: string;
  lat: number;
  lng: number;
  areaLabel: string;
  day: number;
  visitEstimateMin: number;
  siteType: SiteType;
  eraLabels: EraLensId[];
  interpretationTags: InterpretationLensId[];
  historicalSummary: string;
  whyItMatters: string;
  evidenceUrls: string[];
  image: SiteImage | null;
  chronologyLabel: string;
  standingStatus: StandingStatus;
  score: number;
}

export interface TimelineGenerationResult {
  title: string;
  overview: string;
  whyThisRouteWorks: string;
  transitionLogic: string;
  chapterOrder: string[];
  chapters: Array<{
    stopId: string;
    summary: string;
    kicker: string;
    dateLabel: string;
  }>;
  feasibleStopIds: string[];
  readMinutes: number;
  walkKilometers: number;
  warnings: string[];
}
