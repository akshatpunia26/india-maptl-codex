import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { readCache, writeCache } from "@/lib/history/cache";
import { getCityDossierByKey } from "@/lib/history/dossier";
import { timelineNarrationSchema } from "@/lib/history/schemas";
import { EraLensId, InterpretationLensId } from "@/lib/history/taxonomy";
import { CityDossier, FeasibleStop, TimelineGenerationResult, TimelineRequestInput } from "@/lib/history/types";
import { average, cacheKeyFor, clamp, formatDateLabel } from "@/lib/history/utils";
import { openai, openaiModel } from "@/lib/history/openai";

const JOURNEY_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function stopLimitForTrip(tripLength: string, pace: string) {
  const base =
    tripLength === "Half day"
      ? 4
      : tripLength === "1 day"
        ? 5
        : tripLength === "Weekend"
          ? 8
          : 10;

  if (pace === "Slow") {
    return { min: Math.max(3, base - 1), max: base };
  }

  if (pace === "Fast") {
    return { min: base, max: base + 1 };
  }

  return { min: Math.max(3, base - 1), max: base };
}

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

function siteSelectionScore(site: CityDossier["candidateSites"][number], clusterPenalty: number) {
  return clamp(
    average([
      site.coordConfidence,
      site.imageScore,
      site.storyworthyScore,
      site.routeFitScore,
      site.chronologyScore,
      site.mappableScore,
      clusterPenalty,
    ]),
    0,
    1,
  );
}

function clusterRadiusKmForTrip(tripLength: string) {
  switch (tripLength) {
    case "Half day":
      return 3.2;
    case "1 day":
      return 6.5;
    case "Weekend":
      return 8.5;
    case "Multi day":
    default:
      return 10;
  }
}

function buildProximityClusters(
  sites: CityDossier["candidateSites"],
  tripLength: string,
) {
  const thresholdKm = clusterRadiusKmForTrip(tripLength);
  const clusters: Array<{
    key: string;
    centroid: [number, number];
    sites: CityDossier["candidateSites"];
  }> = [];

  const sortedSites = [...sites].sort((left, right) => {
    if (left.eraStart !== right.eraStart) {
      return left.eraStart - right.eraStart;
    }

    return right.storyworthyScore - left.storyworthyScore;
  });

  for (const site of sortedSites) {
    let bestClusterIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const [index, cluster] of clusters.entries()) {
      const distance = haversineKm(cluster.centroid, [site.lng, site.lat]);
      if (distance <= thresholdKm && distance < bestDistance) {
        bestClusterIndex = index;
        bestDistance = distance;
      }
    }

    if (bestClusterIndex === -1) {
      clusters.push({
        key: site.areaLabel || site.shortLabel,
        centroid: [site.lng, site.lat],
        sites: [site],
      });
      continue;
    }

    const cluster = clusters[bestClusterIndex];
    cluster.sites.push(site);

    const lng = average(cluster.sites.map((entry) => entry.lng));
    const lat = average(cluster.sites.map((entry) => entry.lat));
    cluster.centroid = [lng, lat];
  }

  return clusters;
}

function computeFeasibleStops(
  dossier: CityDossier,
  selectedEra: EraLensId,
  selectedInterpretationLens: InterpretationLensId,
  tripLength: string,
  pace: string,
) {
  const filtered = dossier.candidateSites.filter(
    (site) =>
      site.standingStatus !== "lost-supporting" &&
      site.eraLabels.includes(selectedEra) &&
      site.interpretationTags.includes(selectedInterpretationLens),
  );

  const { max } = stopLimitForTrip(tripLength, pace);
  if (filtered.length === 0) {
    return [];
  }

  const orderedClusters = buildProximityClusters(filtered, tripLength)
    .map(({ key, sites }) => ({
      clusterKey: key,
      sites: sites
        .map((site) => ({
          site,
          score: siteSelectionScore(site, clamp(1 - sites.length / 8, 0.6, 1)),
        }))
        .sort((left, right) => {
          if (left.site.eraStart !== right.site.eraStart) {
            return left.site.eraStart - right.site.eraStart;
          }
          return right.score - left.score;
        }),
      clusterScore: average(sites.map((site) => site.routeFitScore + site.storyworthyScore)),
    }))
    .sort((left, right) => right.clusterScore - left.clusterScore);

  const maxClusters =
    tripLength === "Half day"
      ? 1
      : tripLength === "1 day"
        ? 2
        : tripLength === "Weekend"
          ? 2
          : 3;

  const chosenClusters = orderedClusters.slice(0, maxClusters);
  const chosenStops = chosenClusters.flatMap((cluster) => cluster.sites.map((entry) => entry.site));

  const orderedStops = chosenStops
    .sort((left, right) => {
      if (left.eraStart !== right.eraStart) {
        return left.eraStart - right.eraStart;
      }
      return right.storyworthyScore - left.storyworthyScore;
    })
    .slice(0, max);

  return orderedStops.map((site, index) => ({
    id: site.id,
    title: site.title,
    shortLabel: site.shortLabel,
    lat: site.lat,
    lng: site.lng,
    areaLabel: site.areaLabel,
    day:
      tripLength === "Weekend"
        ? index < Math.ceil(orderedStops.length / 2)
          ? 1
          : 2
        : tripLength === "Multi day"
          ? Math.min(3, Math.floor(index / Math.max(1, Math.ceil(orderedStops.length / 3))) + 1)
          : 1,
    visitEstimateMin: site.visitEstimateMin,
    siteType: site.siteType,
    eraLabels: site.eraLabels,
    interpretationTags: site.interpretationTags,
    historicalSummary: site.historicalSummary,
    whyItMatters: site.whyItMatters,
    evidenceUrls: site.evidenceUrls,
    image: site.image,
    chronologyLabel: formatDateLabel(site.eraStart, site.eraEnd),
    standingStatus: site.standingStatus,
    score: Number(siteSelectionScore(site, 1).toFixed(2)),
  }));
}

function fallbackTimelineNarration(feasibleStops: FeasibleStop[], placeLabel: string): TimelineGenerationResult {
  return {
    title: `${placeLabel}: Standing history in sequence`,
    overview: `A route through surviving sites, ordered from the oldest standing layer to the newest urban memory still visible today.`,
    whyThisRouteWorks: `The route keeps to sites that still exist, stay mappable on the ground, and form a coherent chronological walk through the city.`,
    transitionLogic: `Each stop advances the city through a visible change in patronage, form, or civic memory.`,
    chapterOrder: feasibleStops.map((stop) => stop.id),
    chapters: feasibleStops.map((stop) => ({
      stopId: stop.id,
      summary: stop.whyItMatters,
      kicker: stop.areaLabel,
      dateLabel: stop.chronologyLabel,
    })),
    feasibleStopIds: feasibleStops.map((stop) => stop.id),
    readMinutes: Math.max(4, feasibleStops.length + 2),
    walkKilometers: Number(
      feasibleStops
        .slice(1)
        .reduce((sum, stop, index) => sum + haversineKm(
          [feasibleStops[index].lng, feasibleStops[index].lat],
          [stop.lng, stop.lat],
        ), 0)
        .toFixed(1),
    ),
    warnings: [],
  };
}

export async function generateTimelineFromDossier(input: TimelineRequestInput) {
  const dossier = await getCityDossierByKey(input.dossierKey);
  if (!dossier) {
    throw new Error("Dossier not found");
  }

  const cacheKey = cacheKeyFor(
    "timeline",
    input.dossierKey,
    input.selectedEra,
    input.selectedInterpretationLens,
    input.tripLength,
    input.pace,
  );
  const cached = await readCache<{
    timeline: TimelineGenerationResult;
    feasibleStops: FeasibleStop[];
  }>("journeys", cacheKey, JOURNEY_CACHE_TTL_MS);
  if (cached) {
    return {
      dossier,
      ...cached,
      fromCache: true,
    };
  }

  const feasibleStops = computeFeasibleStops(
    dossier,
    input.selectedEra,
    input.selectedInterpretationLens,
    input.tripLength,
    input.pace,
  );

  if (feasibleStops.length === 0) {
    throw new Error(
      "We found limited standing-history coverage for this place. Try a broader city name or switch to a theme route.",
    );
  }

  let timeline = fallbackTimelineNarration(feasibleStops, dossier.place.canonicalLabel);
  const timelineWarnings =
    feasibleStops.length < 3
      ? [
          "Coverage is thinner for this exact lens, so this story uses a shorter validated route than usual.",
        ]
      : [];

  if (openai) {
    const response = await openai.responses.parse({
      model: openaiModel,
      store: false,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are writing a standing-history timeline for an Indian city. Use only the provided feasible stop IDs and data. Do not invent stops, coordinates, or evidence. Preserve chronological order unless the supplied shortlist makes a small swap necessary for route logic. Return concise, editorial product copy.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                place: dossier.place.canonicalLabel,
                selectedEra: input.selectedEra,
                selectedInterpretationLens: input.selectedInterpretationLens,
                tripLength: input.tripLength,
                pace: input.pace,
                feasibleStops,
              }),
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(timelineNarrationSchema, "timeline_narration"),
      },
    });

    const parsed = response.output_parsed;
    if (parsed) {
      const allowedIds = new Set(feasibleStops.map((stop) => stop.id));
      const everyChapterAllowed =
        parsed.chapterOrder.every((id) => allowedIds.has(id)) &&
        parsed.chapters.every((chapter) => allowedIds.has(chapter.stopId));

      if (everyChapterAllowed) {
        timeline = {
          ...parsed,
          walkKilometers: Number(parsed.walkKilometers.toFixed(1)),
          feasibleStopIds: feasibleStops.map((stop) => stop.id),
          warnings: timelineWarnings,
        };
      }
    }
  }

  if (timeline.warnings.length === 0 && timelineWarnings.length > 0) {
    timeline = {
      ...timeline,
      warnings: timelineWarnings,
    };
  }

  await writeCache("journeys", cacheKey, {
    timeline,
    feasibleStops,
  });

  return {
    dossier,
    timeline,
    feasibleStops,
    fromCache: false,
  };
}
