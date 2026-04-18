import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { buildCityDossier } from "@/lib/history/dossier";
import { resolvePlaceCandidates } from "@/lib/history/mapbox";
import { openai, openaiModel } from "@/lib/history/openai";
import {
  askResponseSchema,
  journeyGenerationSchema,
  narrationSchema,
  storyCardSchema,
  storyPackSchema,
  tokenSchema,
  triviaSchema,
} from "@/lib/walk/schemas";
import { getAgraFallbackContext } from "@/lib/walk/data";
import {
  CityContext,
  Curiosity,
  JourneyConcept,
  RouteData,
  StoryPack,
  WalkCandidatePlace,
  WalkContext,
} from "@/lib/walk/types";

const curiosityFallbacks: Record<Curiosity, Curiosity[]> = {
  power: ["architecture", "old city"],
  sacred: ["river", "old city"],
  markets: ["old city", "architecture"],
  architecture: ["power", "old city"],
  ruins: ["power", "architecture"],
  river: ["sacred", "old city"],
  "old city": ["markets", "power"],
  "surprise me": ["power", "sacred"],
};

function distanceKm(a: [number, number], b: [number, number]) {
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

function filterCuriosity(candidates: WalkCandidatePlace[], curiosity: Curiosity) {
  const token = curiosity.toLowerCase();
  if (token === "surprise me") {
    return candidates;
  }

  const filtered = candidates.filter((candidate) => {
    const text = `${candidate.title} ${candidate.areaLabel} ${candidate.historicalSummary} ${candidate.whyItMatters} ${candidate.siteType}`.toLowerCase();
    return text.includes(token);
  });

  return filtered.length >= 4 ? filtered : [];
}

export async function get_city_context(city: string, duration: string, curiosity: Curiosity): Promise<CityContext> {
  if (city.trim().toLowerCase() === "agra") {
    return getAgraFallbackContext(duration, curiosity);
  }

  const resolvedPlace = (await resolvePlaceCandidates(`${city}, India`))[0];
  if (!resolvedPlace) {
    return getAgraFallbackContext(duration, curiosity);
  }

  const dossier = (await buildCityDossier(resolvedPlace)).dossier;
  const allCandidates: WalkCandidatePlace[] = dossier.candidateSites
    .filter((site) => site.image && site.evidenceUrls.length > 0)
    .map((site) => ({
      id: site.id,
      title: site.title,
      shortLabel: site.shortLabel,
      lat: site.lat,
      lng: site.lng,
      areaLabel: site.areaLabel,
      siteType: site.siteType,
      standingStatus: site.standingStatus,
      image: site.image!,
      evidenceUrls: site.evidenceUrls,
      chronologyLabel: `${site.eraStart}–${site.eraEnd}`,
      whyItMatters: site.whyItMatters,
      historicalSummary: site.historicalSummary,
      sourceQuality: site.sourceQuality,
      mappableConfidence: site.mappableScore,
      survivingConfidence: site.standingStatus === "standing" ? 0.95 : site.standingStatus === "partial" ? 0.78 : 0.62,
    }))
    .filter((site) => site.mappableConfidence > 0.55 && site.survivingConfidence > 0.55);

  let resolvedCuriosity = curiosity;
  let selectedCandidates = filterCuriosity(allCandidates, curiosity);
  let curiosityReason: string | undefined;

  if (selectedCandidates.length < 4) {
    const fallback = curiosityFallbacks[curiosity].find((nextCuriosity) => filterCuriosity(allCandidates, nextCuriosity).length >= 4);
    if (fallback) {
      resolvedCuriosity = fallback;
      selectedCandidates = filterCuriosity(allCandidates, fallback);
      curiosityReason = `Coverage for ${curiosity} was weak, so we mapped to ${fallback}.`;
    } else {
      selectedCandidates = allCandidates;
    }
  }

  return {
    city,
    normalizedCity: city.trim().toLowerCase(),
    duration,
    curiosity,
    resolvedCuriosity,
    curiosityReason,
    center: resolvedPlace.center,
    bounds: resolvedPlace.bbox
      ? [[resolvedPlace.bbox[0], resolvedPlace.bbox[1]], [resolvedPlace.bbox[2], resolvedPlace.bbox[3]]]
      : [[resolvedPlace.center[0] - 0.06, resolvedPlace.center[1] - 0.06], [resolvedPlace.center[0] + 0.06, resolvedPlace.center[1] + 0.06]],
    candidates: selectedCandidates,
    coverage: selectedCandidates.length >= 5 ? "strong" : "weak",
    warnings: dossier.warnings,
  };
}

function fallbackJourneys(candidates: WalkCandidatePlace[], city: string): JourneyConcept[] {
  const ids = candidates.slice(0, 6).map((candidate) => candidate.id);
  return [
    {
      id: "journey-1",
      title: `imperial ${city.toLowerCase()}`,
      hook: "walk the surviving spine of power from citadel to river edge.",
      rationale: "These stops cluster tightly and hold the core power thread.",
      candidateStopIds: ids.slice(0, 5),
      confidence: 0.87,
    },
    {
      id: "journey-2",
      title: "the river and the afterlife of empire",
      hook: "follow how court, tomb, and garden still face the water.",
      rationale: "The route stays coherent along the same urban-river band.",
      candidateStopIds: ids.slice(1, 6),
      confidence: 0.79,
    },
    {
      id: "journey-3",
      title: "the city beyond the postcard",
      hook: "move from monument walls into the streets that carried them.",
      rationale: "Adds one lived-city stop while keeping short transfer legs.",
      candidateStopIds: ids.slice(0, 4),
      confidence: 0.74,
    },
  ];
}

export async function generate_journeys(candidates: WalkCandidatePlace[], curiosity: Curiosity, duration: string, city: string) {
  if (!openai || candidates.length < 4) {
    return fallbackJourneys(candidates, city);
  }

  const response = await openai.responses.parse({
    model: openaiModel,
    store: false,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: "You craft vivid walking journey options for Indian city storytelling. Output strict JSON only." }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              city,
              curiosity,
              duration,
              rules: [
                "Exactly 3 journeys",
                "Use only candidateStopIds that exist in provided candidates",
                "4 to 6 stops per journey",
                "No academic wording",
                "Short grounded copy",
              ],
              candidates: candidates.map((candidate) => ({
                id: candidate.id,
                title: candidate.title,
                areaLabel: candidate.areaLabel,
                siteType: candidate.siteType,
                whyItMatters: candidate.whyItMatters,
              })),
            }),
          },
        ],
      },
    ],
    text: { format: zodTextFormat(journeyGenerationSchema, "journeys") },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    return fallbackJourneys(candidates, city);
  }

  const allowed = new Set(candidates.map((candidate) => candidate.id));

  return parsed.journeys.map((journey, index) => ({
    id: `journey-${index + 1}`,
    title: journey.title.toLowerCase(),
    hook: journey.hook,
    rationale: journey.rationale,
    candidateStopIds: journey.candidateStopIds.filter((id) => allowed.has(id)).slice(0, 6),
    confidence: journey.confidence,
  }));
}

export function optimize_walk_route(stops: WalkCandidatePlace[]) {
  if (stops.length <= 2) {
    return stops;
  }

  const remaining = [...stops];
  const ordered: WalkCandidatePlace[] = [remaining.shift()!];

  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const distance = distanceKm([last.lng, last.lat], [candidate.lng, candidate.lat]);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }

    ordered.push(remaining.splice(closestIndex, 1)[0]);
  }

  return ordered;
}

export async function get_walk_route(stops: WalkCandidatePlace[]): Promise<RouteData> {
  if (stops.length < 2) {
    return {
      orderedStopIds: stops.map((stop) => stop.id),
      routeCoordinates: stops.map((stop) => [stop.lng, stop.lat]),
      legDurationsMin: [],
      totalDistanceKm: 0,
      totalTimeMin: 0,
    };
  }

  const token = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (token) {
    const coords = stops.map((stop) => `${stop.lng},${stop.lat}`).join(";");
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${token}`;
    const response = await fetch(url, { next: { revalidate: 0 } });

    if (response.ok) {
      const payload = await response.json();
      const route = payload.routes?.[0];
      if (route) {
        const legs = route.legs ?? [];
        return {
          orderedStopIds: stops.map((stop) => stop.id),
          routeCoordinates: route.geometry.coordinates,
          legDurationsMin: legs.map((leg: { duration: number }) => Math.round(leg.duration / 60)),
          totalDistanceKm: Number((route.distance / 1000).toFixed(1)),
          totalTimeMin: Math.round(route.duration / 60),
        };
      }
    }
  }

  let totalDistanceKm = 0;
  const legDurationsMin: number[] = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];
    const legDistance = distanceKm([from.lng, from.lat], [to.lng, to.lat]);
    totalDistanceKm += legDistance;
    legDurationsMin.push(Math.round((legDistance / 4.3) * 60));
  }

  return {
    orderedStopIds: stops.map((stop) => stop.id),
    routeCoordinates: stops.map((stop) => [stop.lng, stop.lat]),
    legDurationsMin,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalTimeMin: legDurationsMin.reduce((sum, mins) => sum + mins, 0),
  };
}

export async function generate_story_pack(journey: JourneyConcept, orderedStops: WalkCandidatePlace[], routeData: RouteData): Promise<StoryPack> {
  if (!openai) {
    return {
      walkTitle: journey.title,
      walkIntro: `This walk follows one clear thread: ${journey.hook}`,
      stopNarratives: orderedStops.map((stop, index) => ({
        stopId: stop.id,
        whyThisStopMatters: stop.whyItMatters,
        whatToNoticeNow: `Notice ${stop.shortLabel.toLowerCase()} details that still anchor the street around you.`,
        threadConnection: stop.historicalSummary,
        transitionToNext: index < orderedStops.length - 1 ? `From here, continue toward ${orderedStops[index + 1].title}.` : "",
      })),
      finalTakeaway: "You walked a living thread built from what still stands.",
      readTimeMin: Math.max(6, orderedStops.length * 2),
      listenTimeMin: Math.max(7, orderedStops.length * 2),
    };
  }

  const response = await openai.responses.parse({
    model: openaiModel,
    store: false,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: "Write authored walk copy in calm, specific language. Strict JSON only." }],
      },
      {
        role: "user",
        content: [{
          type: "input_text",
          text: JSON.stringify({
            journey,
            routeData,
            orderedStops: orderedStops.map((stop) => ({
              id: stop.id,
              title: stop.title,
              chronologyLabel: stop.chronologyLabel,
              whyItMatters: stop.whyItMatters,
              historicalSummary: stop.historicalSummary,
            })),
            rules: ["Do not invent facts", "Ground every line in provided stop details", "One transition per stop"],
          }),
        }],
      },
    ],
    text: { format: zodTextFormat(storyPackSchema, "story_pack") },
  });

  return response.output_parsed!;
}

async function parseSimple<T>(schemaName: string, schema: { parse: (value: unknown) => T }, payload: unknown): Promise<T | null> {
  if (!openai) return null;

  const response = await openai.responses.parse({
    model: openaiModel,
    store: false,
    input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(payload) }] }],
    text: { format: zodTextFormat(schema as never, schemaName) },
  });

  return response.output_parsed as T;
}

export async function ask_this_walk(question: string, walk_context: WalkContext, current_stop: string) {
  const parsed = await parseSimple("ask_response", askResponseSchema, {
    instruction: "Answer only from this walk context and current stop. If unknown, say it clearly.",
    question,
    current_stop,
    walk_context,
  });

  return parsed ?? { answer: "I can answer from this walk only. Ask about this stop or the route.", sourceStopIds: [] };
}

export async function generate_trivia(walk_context: WalkContext) {
  const parsed = await parseSimple("trivia", triviaSchema, {
    instruction: "Generate exactly 3 short trivia cards from this walk context.",
    walk_context,
  });

  return parsed ?? {
    cards: [
      { type: "surprising fact", text: "Agra's power core was planned as a connected river-city system." },
      { type: "spot-this detail", text: "Look for repeated red sandstone and marble transitions as you move between stops." },
      { type: "then vs now", text: "Imperial courts are gone, but the route still anchors daily movement in the same zones." },
    ],
  };
}

export async function generate_city_token(city: string, journey: JourneyConcept) {
  const parsed = await parseSimple("city_token", tokenSchema, {
    instruction: "Generate a compact city token unlock title and line.",
    city,
    journey,
  });

  return parsed ?? {
    tokenTitle: `${city} · ${journey.title}`,
    unlockLine: "Thread unlocked: you completed one surviving route.",
    badge: { shape: "fort", primaryColor: "#5d3a1a", secondaryColor: "#d4b483", glyph: "⛫" },
  };
}

export async function generate_story_card(walk_context: WalkContext) {
  const parsed = await parseSimple("story_card", storyCardSchema, {
    instruction: "Generate concise share card copy from this walk.",
    walk_context,
  });

  return parsed ?? {
    city: walk_context.city,
    walkTitle: walk_context.journey.title,
    hook: walk_context.journey.hook,
    keyStops: walk_context.orderedStops.slice(0, 3).map((stop) => stop.title),
    closingLine: "Built from what still stands.",
  };
}

export async function generate_narration(walk_context: WalkContext) {
  const parsed = await parseSimple("narration", narrationSchema, {
    instruction: "Write a short voice script for this walk.",
    walk_context,
  });

  return {
    script: parsed?.script ?? `${walk_context.storyPack.walkIntro} ${walk_context.storyPack.finalTakeaway}`,
    audioUrl: null,
  };
}
