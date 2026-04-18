import { z } from "zod";

import { generate_city_token } from "@/lib/walk/engine";

const schema = z.object({ city: z.string(), journey: z.any() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const token = await generate_city_token(body.city, body.journey);
    return Response.json(token);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to generate token" }, { status: 500 });
  }
}
