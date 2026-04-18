import { z } from "zod";

import { openai, openaiModel } from "@/lib/history/openai";
import { StoryPayload } from "@/lib/journey/types";

const requestSchema = z.object({
  question: z.string().min(8),
  story: z.custom<StoryPayload>(),
  activeChapterIndex: z.number().int().min(0).default(0),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const chapter = body.story.narrative.chapters[body.activeChapterIndex] ?? body.story.narrative.chapters[0];

    if (!openai) {
      return Response.json({
        answer:
          "OpenAI is not configured in this deployment yet. Add OPENAI_API_KEY to enable in-walk questions.",
      });
    }

    const response = await openai.responses.create({
      model: openaiModel,
      store: false,
      input: [
        {
          role: "system",
          content:
            "You are a heritage walk guide. Answer with specific evidence from the provided stops. Keep it concise and practical.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question: body.question,
            activeChapter: chapter,
            places: body.story.places,
            routeTitle: body.story.narrative.title,
            selectedEra: body.story.selectedEra,
            interpretationLens: body.story.selectedInterpretationLens,
          }),
        },
      ],
    });

    const answer = response.output_text?.trim() || "I could not generate a grounded answer for this question.";
    return Response.json({ answer });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Question answering failed." },
      { status: 400 },
    );
  }
}
