import { buildCityDossier, getCityDossierByKey } from "@/lib/history/dossier";
import { computeLensEligibility } from "@/lib/history/lenses";
import { placeCandidateSchema } from "@/lib/history/schemas";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      dossierKey?: string;
      place?: unknown;
    };

    const dossier =
      body.dossierKey
        ? await getCityDossierByKey(body.dossierKey)
        : body.place
          ? (await buildCityDossier(placeCandidateSchema.parse(body.place))).dossier
          : null;

    if (!dossier) {
      return Response.json(
        {
          error: "No dossier found for lens generation",
        },
        { status: 404 },
      );
    }

    const result = computeLensEligibility(dossier);
    return Response.json({
      dossierKey: dossier.key,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Lens generation failed",
      },
      { status: 500 },
    );
  }
}
