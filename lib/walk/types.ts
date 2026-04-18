import { SiteImage } from "@/lib/history/types";

export type Curiosity =
  | "power"
  | "sacred"
  | "markets"
  | "architecture"
  | "ruins"
  | "river"
  | "old city"
  | "surprise me";

export interface WalkCandidatePlace {
  id: string;
  title: string;
  shortLabel: string;
  lat: number;
  lng: number;
  areaLabel: string;
  siteType: string;
  standingStatus: string;
  image: SiteImage;
  evidenceUrls: string[];
  chronologyLabel: string;
  whyItMatters: string;
  historicalSummary: string;
  sourceQuality: number;
  mappableConfidence: number;
  survivingConfidence: number;
}

export interface CityContext {
  city: string;
  normalizedCity: string;
  duration: string;
  curiosity: Curiosity;
  resolvedCuriosity: Curiosity;
  curiosityReason?: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  candidates: WalkCandidatePlace[];
  coverage: "strong" | "weak";
  warnings: string[];
}

export interface JourneyConcept {
  id: string;
  title: string;
  hook: string;
  rationale: string;
  candidateStopIds: string[];
  confidence: number;
}

export interface RouteData {
  orderedStopIds: string[];
  routeCoordinates: [number, number][];
  legDurationsMin: number[];
  totalDistanceKm: number;
  totalTimeMin: number;
}

export interface StoryStop {
  stopId: string;
  whyThisStopMatters: string;
  whatToNoticeNow: string;
  threadConnection: string;
  transitionToNext: string;
}

export interface StoryPack {
  walkTitle: string;
  walkIntro: string;
  stopNarratives: StoryStop[];
  finalTakeaway: string;
  readTimeMin: number;
  listenTimeMin: number;
}

export interface WalkContext {
  city: string;
  journey: JourneyConcept;
  orderedStops: WalkCandidatePlace[];
  routeData: RouteData;
  storyPack: StoryPack;
}
