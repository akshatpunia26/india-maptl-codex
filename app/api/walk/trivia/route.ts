import { z } from "zod";

import { generate_trivia } from "@/lib/walk/engine";

const schema = z.object({ walkContext: z.any() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const trivia = await generate_trivia(body.walkContext);
    return Response.json(trivia);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to generate trivia" }, { status: 500 });
  }
}
