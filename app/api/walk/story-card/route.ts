import { z } from "zod";

import { generate_story_card } from "@/lib/walk/engine";

const schema = z.object({ walkContext: z.any() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const card = await generate_story_card(body.walkContext);
    return Response.json(card);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to generate story card" }, { status: 500 });
  }
}
