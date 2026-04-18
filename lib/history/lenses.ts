import "server-only";

import {
  CityDossier,
  LensesGenerationResult,
  LensScore,
  CandidateSite,
} from "@/lib/history/types";
import {
  ERA_LENS_IDS,
  ERA_LENS_META,
  EraLensId,
  INTERPRETATION_LENS_IDS,
  INTERPRETATION_LENS_META,
  InterpretationLensId,
} from "@/lib/history/taxonomy";
import { average, clamp } from "@/lib/history/utils";

function standingWeight(status: CandidateSite["standingStatus"]) {
  switch (status) {
    case "standing":
      return 1;
    case "partial":
      return 0.85;
    case "trace":
      return 0.65;
    case "lost-supporting":
    default:
      return 0.2;
  }
}

function siteConfidence(site: CandidateSite) {
  return clamp(
    average([
      standingWeight(site.standingStatus),
      site.coordConfidence,
      site.sourceQuality,
      site.mappableScore,
      site.chronologyScore,
    ]),
    0,
    1,
  );
}

function scoreLensSites(sites: CandidateSite[]) {
  const routeFeasibility = average(sites.map((site) => site.routeFitScore));
  const narrativeUsefulness = average(sites.map((site) => site.storyworthyScore));
  const avgConfidence = average(sites.map(siteConfidence));
  const marqueeSites = sites.filter((site) => site.storyworthyScore >= 0.82 && site.standingStatus !== "lost-supporting");
  const standingSites = sites.filter((site) => site.standingStatus !== "lost-supporting");

  const eligible =
    (standingSites.length >= 2 || (marqueeSites.length >= 1 && sites.length >= 3)) &&
    avgConfidence >= 0.58 &&
    routeFeasibility >= 0.44 &&
    narrativeUsefulness >= 0.45;

  return {
    eligible,
    avgConfidence,
    routeFeasibility,
    narrativeUsefulness,
    score: clamp(
      average([
        avgConfidence,
        routeFeasibility,
        narrativeUsefulness,
        standingSites.length >= 2 ? 0.9 : marqueeSites.length >= 1 ? 0.7 : 0.2,
      ]),
      0,
      1,
    ),
  };
}

function buildLensScore(
  id: EraLensId | InterpretationLensId,
  label: string,
  sites: CandidateSite[],
): LensScore | null {
  if (sites.length === 0) {
    return null;
  }

  const scored = scoreLensSites(sites);
  if (!scored.eligible) {
    return null;
  }

  return {
    id,
    label,
    score: Number(scored.score.toFixed(2)),
    avgConfidence: Number(scored.avgConfidence.toFixed(2)),
    supportingSiteIds: sites.map((site) => site.id),
    routeFeasibility: Number(scored.routeFeasibility.toFixed(2)),
    narrativeUsefulness: Number(scored.narrativeUsefulness.toFixed(2)),
  };
}

export function computeLensEligibility(dossier: Pick<CityDossier, "candidateSites" | "coverageConfidence">): LensesGenerationResult {
  const standingSites = dossier.candidateSites.filter((site) => site.standingStatus !== "lost-supporting");

  const eligibleEras = ERA_LENS_IDS.map((id) =>
    buildLensScore(
      id,
      `${ERA_LENS_META[id].label} · ${ERA_LENS_META[id].rangeLabel}`,
      standingSites.filter((site) => site.eraLabels.includes(id)),
    ),
  )
    .filter((score): score is LensScore => Boolean(score))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  const eligibleInterpretationLenses = INTERPRETATION_LENS_IDS.map((id) =>
    buildLensScore(
      id,
      INTERPRETATION_LENS_META[id].label,
      standingSites.filter((site) => site.interpretationTags.includes(id)),
    ),
  )
    .filter((score): score is LensScore => Boolean(score))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  const interpretationLensesByEra = Object.fromEntries(
    ERA_LENS_IDS.map((eraId) => {
      const eraSites = standingSites.filter((site) => site.eraLabels.includes(eraId));
      const scoredLenses = INTERPRETATION_LENS_IDS.map((lensId) =>
        buildLensScore(
          lensId,
          INTERPRETATION_LENS_META[lensId].label,
          eraSites.filter((site) => site.interpretationTags.includes(lensId)),
        ),
      )
        .filter((score): score is LensScore => Boolean(score))
        .sort((left, right) => right.score - left.score)
        .slice(0, 6);
      return [eraId, scoredLenses];
    }),
  ) as Partial<Record<EraLensId, LensScore[]>>;

  const warnings: string[] = [];
  if (standingSites.length < 3) {
    warnings.push(
      "We found limited standing-history coverage for this place. Try a broader city name or switch to a theme route.",
    );
  }
  if (eligibleEras.length === 0 || eligibleInterpretationLenses.length === 0) {
    warnings.push(
      "Evidence is too thin for a strong route here right now. Try a broader city name or a nearby urban center.",
    );
  }

  return {
    eligibleEras,
    eligibleInterpretationLenses,
    interpretationLensesByEra,
    recommendedDefaults: {
      era: eligibleEras[0]?.id as EraLensId | undefined,
      interpretationLens:
        (interpretationLensesByEra[eligibleEras[0]?.id as EraLensId]?.[0]?.id as
          | InterpretationLensId
          | undefined) ?? (eligibleInterpretationLenses[0]?.id as InterpretationLensId | undefined),
    },
    coverageConfidence: dossier.coverageConfidence,
    warnings,
  };
}

export function buildLensScoreMaps(sites: CandidateSite[]) {
  const eraScores = Object.fromEntries(
    ERA_LENS_IDS.map((id) => {
      const score = buildLensScore(
        id,
        ERA_LENS_META[id].label,
        sites.filter((site) => site.eraLabels.includes(id) && site.standingStatus !== "lost-supporting"),
      );
      return [id, score?.score ?? 0];
    }),
  ) as Record<EraLensId, number>;

  const interpretationScores = Object.fromEntries(
    INTERPRETATION_LENS_IDS.map((id) => {
      const score = buildLensScore(
        id,
        INTERPRETATION_LENS_META[id].label,
        sites.filter(
          (site) =>
            site.interpretationTags.includes(id) && site.standingStatus !== "lost-supporting",
        ),
      );
      return [id, score?.score ?? 0];
    }),
  ) as Record<InterpretationLensId, number>;

  return {
    eraScores,
    interpretationScores,
  };
}
