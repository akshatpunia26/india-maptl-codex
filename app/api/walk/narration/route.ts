import { z } from "zod";

import { generate_narration } from "@/lib/walk/engine";

const schema = z.object({ walkContext: z.any() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const narration = await generate_narration(body.walkContext);
    return Response.json(narration);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to generate narration" }, { status: 500 });
  }
}
