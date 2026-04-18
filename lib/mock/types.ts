export type IntentId = "empire-power" | "sacred-pilgrimage" | "trade-waterways";

export type StylePreset = "modern" | "vintage" | "museum-poster";

export type MarkerIconKey = "citadel" | "sanctum" | "bazaar" | "archive";

export interface IntentOption {
  id: IntentId;
  label: string;
  description: string;
}

export interface Place {
  id: string;
  title: string;
  lat: number;
  lng: number;
  era: string;
  themeTags: string[];
  blurb: string;
  dateLabel: string;
  iconKey: MarkerIconKey;
}

export interface NarrativeChapter {
  id: string;
  placeId: string;
  title: string;
  kicker: string;
  summary: string;
  dateLabel: string;
}

export interface NarrativeResult {
  title: string;
  subtitle: string;
  chapters: NarrativeChapter[];
  routeCoordinates: [number, number][];
  stylePreset: StylePreset;
  composedIn?: string;
  spanLabel?: string;
  readMinutes?: number;
  walkKilometers?: number;
}

export interface CityPreset {
  id: string;
  name: string;
  region: string;
  overview: string;
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
  places: Place[];
  narrative: NarrativeResult;
}
