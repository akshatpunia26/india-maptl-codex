import { z } from "zod";

import { generate_journeys } from "@/lib/walk/engine";

const schema = z.object({
  city: z.string(),
  curiosity: z.enum(["power", "sacred", "markets", "architecture", "ruins", "river", "old city", "surprise me"]),
  duration: z.string(),
  candidates: z.array(z.any()),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const journeys = await generate_journeys(body.candidates, body.curiosity, body.duration, body.city);
    return Response.json({ journeys });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to generate journeys" }, { status: 500 });
  }
}
