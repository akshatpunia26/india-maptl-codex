import { z } from "zod";

import { ERA_LENS_IDS, INTERPRETATION_LENS_IDS } from "@/lib/history/taxonomy";

export const placeCandidateSchema = z.object({
  label: z.string().min(1).max(160),
  canonicalLabel: z.string().min(1).max(160),
  center: z.tuple([z.number().min(60).max(100), z.number().min(5).max(38)]),
  bbox: z.tuple([
    z.number().min(60).max(100),
    z.number().min(5).max(38),
    z.number().min(60).max(100),
    z.number().min(5).max(38),
  ]).optional(),
  placeType: z.string().min(1).max(40),
  mapboxId: z.string().min(1),
  displayContext: z.string().min(1).max(200),
});

export const sourceEvidenceSchema = z.object({
  url: z.string().min(1).max(400),
  title: z.string().min(1).max(180),
  publisher: z.string().min(1).max(120),
  kind: z.enum(["official", "museum", "wikimedia", "encyclopedic", "other"]),
  quality: z.enum(["high", "medium", "low"]),
});

export const extractedSiteSchema = z.object({
  title: z.string().min(1).max(120),
  altNames: z.array(z.string().min(1).max(120)).max(6).default([]),
  shortLabel: z.string().min(1).max(40),
  standingStatus: z.enum(["standing", "partial", "trace", "lost-supporting"]),
  siteType: z.enum([
    "temple",
    "mosque",
    "dargah",
    "fort",
    "palace",
    "gate",
    "stepwell",
    "tank",
    "bazaar",
    "street",
    "cemetery",
    "tomb",
    "civic-building",
    "memorial",
    "museum",
    "bridge",
    "railway",
    "garden",
    "waterfront",
    "neighborhood-trace",
    "other",
  ]),
  areaLabel: z.string().min(1).max(80),
  eraStart: z.number().int().min(-500).max(2100),
  eraEnd: z.number().int().min(-500).max(2100),
  eraLabels: z.array(z.enum(ERA_LENS_IDS)).min(1).max(3),
  interpretationTags: z.array(z.enum(INTERPRETATION_LENS_IDS)).min(1).max(4),
  visitEstimateMin: z.number().int().min(10).max(180),
  historicalSummary: z.string().min(1).max(320),
  whyItMatters: z.string().min(1).max(240),
  evidenceUrls: z.array(z.string().min(1).max(400)).min(1).max(5),
  sourceQuality: z.enum(["high", "medium", "low"]),
  wikidataId: z.string().regex(/^Q\d+$/).nullable(),
  wikipediaTitle: z.string().min(1).max(180).nullable(),
});

export const dossierExtractionSchema = z.object({
  coverageConfidence: z.number().min(0).max(1),
  warnings: z.array(z.string().min(1).max(220)).max(6).default([]),
  sourceEvidence: z.array(sourceEvidenceSchema).max(20).default([]),
  candidateSites: z.array(extractedSiteSchema).max(16).default([]),
});

export const timelineNarrationSchema = z.object({
  title: z.string().min(1).max(140),
  overview: z.string().min(1).max(280),
  whyThisRouteWorks: z.string().min(1).max(280),
  transitionLogic: z.string().min(1).max(240),
  readMinutes: z.number().int().min(3).max(30),
  walkKilometers: z.number().min(0).max(80),
  chapterOrder: z.array(z.string().min(1)).min(1).max(12),
  chapters: z.array(
    z.object({
      stopId: z.string().min(1),
      summary: z.string().min(1).max(220),
      kicker: z.string().min(1).max(36),
      dateLabel: z.string().min(1).max(36),
    }),
  ).min(1).max(12),
});
