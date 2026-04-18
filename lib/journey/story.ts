import { buildNarrativeResult } from "@/lib/journey/helpers";
import { MapDestination, StoryPayload, StoryPlace } from "@/lib/journey/types";
import { TimelineGenerationResult, FeasibleStop } from "@/lib/history/types";
import { EraLensId, InterpretationLensId } from "@/lib/history/taxonomy";
import { MarkerIconKey } from "@/lib/mock/types";

function markerForSiteType(siteType: FeasibleStop["siteType"]): MarkerIconKey {
  switch (siteType) {
    case "temple":
    case "mosque":
    case "dargah":
    case "cemetery":
    case "tomb":
      return "sanctum";
    case "fort":
    case "palace":
    case "gate":
      return "citadel";
    case "bazaar":
    case "street":
    case "railway":
    case "bridge":
      return "bazaar";
    case "museum":
    case "memorial":
    case "civic-building":
    case "garden":
    case "waterfront":
    case "stepwell":
    case "tank":
    case "neighborhood-trace":
    case "other":
    default:
      return "archive";
  }
}

export function buildStoryPayload({
  dossierKey,
  destination,
  feasibleStops,
  timeline,
  selectedEra,
  selectedInterpretationLens,
  coverageConfidence,
}: {
  dossierKey: string;
  destination: MapDestination;
  feasibleStops: FeasibleStop[];
  timeline: TimelineGenerationResult;
  selectedEra: EraLensId;
  selectedInterpretationLens: InterpretationLensId;
  coverageConfidence: number;
}): StoryPayload {
  const placeMap = new Map(feasibleStops.map((stop) => [stop.id, stop]));

  const orderedStops: StoryPlace[] = timeline.chapterOrder.flatMap((stopId, index) => {
      const stop = placeMap.get(stopId);
      if (!stop) {
        return [];
      }

      return [
        {
          id: stop.id,
          title: stop.title,
          lat: stop.lat,
          lng: stop.lng,
          era: stop.chronologyLabel,
          themeTags: stop.interpretationTags,
          blurb: stop.historicalSummary,
          dateLabel: stop.chronologyLabel,
          iconKey: markerForSiteType(stop.siteType),
          day: stop.day,
          markerLabel: String(index + 1).padStart(2, "0"),
          image: stop.image,
          evidenceUrls: stop.evidenceUrls,
          areaLabel: stop.areaLabel,
          whyItMatters: stop.whyItMatters,
          standingStatus: stop.standingStatus,
          chronologyLabel: stop.chronologyLabel,
        },
      ];
    });

  const chapterMap = new Map(timeline.chapters.map((chapter) => [chapter.stopId, chapter]));
  const chapters = orderedStops.map((stop, index) => {
    const chapter = chapterMap.get(stop.id);
    return {
      id: `chapter-${index + 1}`,
      placeId: stop.id,
      title: stop.title,
      kicker: chapter?.kicker ?? stop.areaLabel,
      summary: chapter?.summary ?? stop.whyItMatters,
      dateLabel: chapter?.dateLabel ?? stop.chronologyLabel,
    };
  });

  const narrative = buildNarrativeResult({
    title: timeline.title,
    chapters,
    places: orderedStops,
    stylePreset: "modern",
    readMinutes: timeline.readMinutes,
    walkKilometers: timeline.walkKilometers,
  });

  return {
    dossierKey,
    overview: timeline.overview,
    endSummary: timeline.whyThisRouteWorks,
    exportTitle: `${destination.canonicalLabel.replace(/\s+/g, "-").toLowerCase()}-${selectedEra}-${selectedInterpretationLens}`,
    destination,
    places: orderedStops,
    narrative,
    selectedEra,
    selectedInterpretationLens,
    whyThisRouteWorks: timeline.whyThisRouteWorks,
    transitionLogic: timeline.transitionLogic,
    warnings: timeline.warnings,
    coverageConfidence,
  };
}
