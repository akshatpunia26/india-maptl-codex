import { z } from "zod";

export const journeyGenerationSchema = z.object({
  journeys: z.array(
    z.object({
      title: z.string().min(3),
      hook: z.string().min(8).max(160),
      rationale: z.string().min(12).max(220),
      candidateStopIds: z.array(z.string()).min(4).max(6),
      confidence: z.number().min(0).max(1),
    }),
  ).length(3),
});

export const storyPackSchema = z.object({
  walkTitle: z.string().min(3),
  walkIntro: z.string().min(30),
  stopNarratives: z.array(
    z.object({
      stopId: z.string(),
      whyThisStopMatters: z.string().min(20),
      whatToNoticeNow: z.string().min(12),
      threadConnection: z.string().min(12),
      transitionToNext: z.string().min(8),
    }),
  ),
  finalTakeaway: z.string().min(20),
  readTimeMin: z.number().int().min(4).max(25),
  listenTimeMin: z.number().int().min(4).max(25),
});

export const askResponseSchema = z.object({
  answer: z.string().min(8).max(500),
  sourceStopIds: z.array(z.string()).max(3),
});

export const triviaSchema = z.object({
  cards: z.array(
    z.object({
      type: z.enum(["surprising fact", "spot-this detail", "then vs now"]),
      text: z.string().min(10).max(220),
    }),
  ).length(3),
});

export const tokenSchema = z.object({
  tokenTitle: z.string().min(3).max(80),
  unlockLine: z.string().min(8).max(160),
  badge: z.object({
    shape: z.enum(["arch", "fort", "river", "sun"]),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    glyph: z.string().max(2),
  }),
});

export const storyCardSchema = z.object({
  city: z.string(),
  walkTitle: z.string(),
  hook: z.string().min(8).max(140),
  keyStops: z.array(z.string()).length(3),
  closingLine: z.string().min(8).max(120),
});

export const narrationSchema = z.object({
  script: z.string().min(30).max(1200),
});
