import { z } from "zod";

import { ask_this_walk } from "@/lib/walk/engine";

const schema = z.object({ question: z.string(), walkContext: z.any(), currentStop: z.string() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const answer = await ask_this_walk(body.question, body.walkContext, body.currentStop);
    return Response.json(answer);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to answer" }, { status: 500 });
  }
}
