# India MapTL

India MapTL is a Next.js 16 prototype for generating standing-history timelines for Indian cities. The app resolves a place, builds an evidence-backed city dossier, filters fixed era and interpretation lenses, and generates a stop-by-stop timeline only from validated candidate sites.

## Requirements

- Node.js 20+
- A Mapbox token for the live map and place resolution
- An OpenAI API key for dossier and timeline generation

## Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_public_mapbox_token
MAPBOX_SECRET_TOKEN=your_secret_mapbox_token
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini
```

Notes:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` powers the client-side Mapbox GL map.
- `MAPBOX_SECRET_TOKEN` is used by the server routes for Search Box place resolution and any server-side map lookups.
- `OPENAI_MODEL` is optional. If omitted, the app defaults to `gpt-5.4-mini`.
- If the OpenAI key is missing, dossier and timeline generation will return honest low-confidence responses instead of fake city fallbacks.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
```

## Architecture Notes

The main data flow is:

1. `/api/place/resolve`
   - uses Mapbox Search Box `suggest` and `retrieve`
   - returns normalized city/town candidates for India
2. `/api/dossier/build`
   - reads a cached dossier first
   - otherwise uses OpenAI Responses API with web search to extract standing-history evidence
   - enriches coordinates and imagery through Wikidata and Wikimedia Commons
3. `/api/lenses/generate`
   - applies the fixed taxonomy and eligibility thresholds in code
4. `/api/timeline/generate`
   - computes feasible stops in code
   - asks OpenAI only to sequence and narrate the approved stop list

## Cache

Hackathon-speed persistence lives in `data/cache/`:

- `data/cache/dossiers`
- `data/cache/journeys`
- `data/cache/images`

These JSON files can be safely replaced later with a database or a curated editorial store.

## Standing-History Rules

The current implementation follows these product rules:

- only physically extant monuments, sites, or urban traces can become primary stops
- era lenses are chosen only from the fixed taxonomy
- interpretation lenses are chosen only from the fixed taxonomy
- lenses are surfaced only when the dossier has enough supporting evidence
- the model never invents coordinates, sites, or images for stops

## Manual Curation

There is an explicit hook in [lib/history/dossier.ts](/Users/akshatpunia/Dev/india-maptl-codex/lib/history/dossier.ts) where manual editorial overrides can later merge into the cached dossier before it is saved.
