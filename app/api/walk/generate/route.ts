import { z } from "zod";

import { generate_story_pack } from "@/lib/walk/engine";

const schema = z.object({
  journey: z.any(),
  orderedStops: z.array(z.any()),
  routeData: z.any(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const storyPack = await generate_story_pack(body.journey, body.orderedStops, body.routeData);
    return Response.json({ storyPack });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to generate story" }, { status: 500 });
  }
}
