import { buildCityDossier } from "@/lib/history/dossier";
import { placeCandidateSchema } from "@/lib/history/schemas";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { place: unknown };
    const place = placeCandidateSchema.parse(body.place);
    const result = await buildCityDossier(place);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Dossier build failed",
      },
      { status: 500 },
    );
  }
}
