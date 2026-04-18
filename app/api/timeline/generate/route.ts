import { z } from "zod";

import { generateTimelineFromDossier } from "@/lib/history/timeline";
import { ERA_LENS_IDS, INTERPRETATION_LENS_IDS } from "@/lib/history/taxonomy";

const requestSchema = z.object({
  dossierKey: z.string().min(1),
  selectedEra: z.enum(ERA_LENS_IDS),
  selectedInterpretationLens: z.enum(INTERPRETATION_LENS_IDS),
  tripLength: z.string().min(1),
  pace: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const result = await generateTimelineFromDossier(body);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Timeline generation failed";
    const status =
      message.includes("limited standing-history coverage") || message.includes("Dossier not found")
        ? 422
        : 500;

    return Response.json(
      {
        error: message,
      },
      { status },
    );
  }
}
