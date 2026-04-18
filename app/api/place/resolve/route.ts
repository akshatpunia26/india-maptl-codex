import { NextRequest } from "next/server";

import { resolvePlaceCandidates } from "@/lib/history/mapbox";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (query.length < 2) {
    return Response.json({ candidates: [] });
  }

  try {
    const candidates = await resolvePlaceCandidates(query);
    return Response.json({ candidates });
  } catch (error) {
    return Response.json(
      {
        candidates: [],
        error: error instanceof Error ? error.message : "Place lookup failed",
      },
      { status: 500 },
    );
  }
}
