import { z } from "zod";

import { get_city_context } from "@/lib/walk/engine";

const schema = z.object({
  city: z.string().min(2),
  duration: z.string().min(1),
  curiosity: z.enum(["power", "sacred", "markets", "architecture", "ruins", "river", "old city", "surprise me"]),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const context = await get_city_context(body.city, body.duration, body.curiosity);
    return Response.json(context);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to get city context" }, { status: 500 });
  }
}
