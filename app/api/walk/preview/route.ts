import { z } from "zod";

import { get_walk_route, optimize_walk_route } from "@/lib/walk/engine";

const schema = z.object({
  journey: z.object({ candidateStopIds: z.array(z.string()) }),
  candidates: z.array(z.any()),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const filtered = body.journey.candidateStopIds
      .map((id) => body.candidates.find((candidate) => candidate.id === id))
      .filter(Boolean);
    const ordered = optimize_walk_route(filtered);
    const route = await get_walk_route(ordered);
    return Response.json({ orderedStops: ordered, route });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to preview walk" }, { status: 500 });
  }
}
