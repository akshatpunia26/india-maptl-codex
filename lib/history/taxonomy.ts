export const ERA_LENS_IDS = [
  "early-foundations",
  "temple-and-courtly-citymaking",
  "sultanate-and-regional-capitals",
  "mughal-and-early-modern-urbanism",
  "colonial-and-princely-modernity",
  "postcolonial-civic-memory",
] as const;

export type EraLensId = (typeof ERA_LENS_IDS)[number];

export const INTERPRETATION_LENS_IDS = [
  "sacred-landscapes",
  "power-and-defense",
  "water-and-survival",
  "trade-and-movement",
  "craft-and-patronage",
  "ruins-and-afterlives",
  "memory-and-identity",
  "urban-form-and-everyday-life",
] as const;

export type InterpretationLensId = (typeof INTERPRETATION_LENS_IDS)[number];

export const ERA_LENS_META: Record<
  EraLensId,
  { label: string; rangeLabel: string; description: string }
> = {
  "early-foundations": {
    label: "Early foundations",
    rangeLabel: "up to 600 CE",
    description: "Early settlement traces, inscriptions, and the oldest surviving layers.",
  },
  "temple-and-courtly-citymaking": {
    label: "Temple and courtly citymaking",
    rangeLabel: "600–1200",
    description: "Temple towns, courtly patronage, and early urban form.",
  },
  "sultanate-and-regional-capitals": {
    label: "Sultanate and regional capitals",
    rangeLabel: "1200–1526",
    description: "Fortified capitals, mosques, gateways, and regional courts.",
  },
  "mughal-and-early-modern-urbanism": {
    label: "Mughal and early modern urbanism",
    rangeLabel: "1526–1800",
    description: "Imperial planning, gardens, riverfronts, and mercantile urbanism.",
  },
  "colonial-and-princely-modernity": {
    label: "Colonial and princely modernity",
    rangeLabel: "1800–1947",
    description: "Railways, civic institutions, cantonments, and princely interventions.",
  },
  "postcolonial-civic-memory": {
    label: "Postcolonial civic memory",
    rangeLabel: "1947+",
    description: "Memorials, civic buildings, and modern layers of remembrance.",
  },
};

export const INTERPRETATION_LENS_META: Record<
  InterpretationLensId,
  { label: string; description: string }
> = {
  "sacred-landscapes": {
    label: "Sacred landscapes",
    description: "Shrines, ritual routes, temples, mosques, dargahs, and pilgrimage ground.",
  },
  "power-and-defense": {
    label: "Power and defense",
    description: "Fortifications, courts, palaces, citadels, and ceremonial authority.",
  },
  "water-and-survival": {
    label: "Water and survival",
    description: "Stepwells, tanks, canals, river edges, and hydraulic survival systems.",
  },
  "trade-and-movement": {
    label: "Trade and movement",
    description: "Bazaars, caravan routes, ports, bridges, railways, and urban exchange.",
  },
  "craft-and-patronage": {
    label: "Craft and patronage",
    description: "Workshops, artisan quarters, guild traces, and patron-supported making.",
  },
  "ruins-and-afterlives": {
    label: "Ruins and afterlives",
    description: "Fragments, reused fabric, abandoned compounds, and layered reoccupation.",
  },
  "memory-and-identity": {
    label: "Memory and identity",
    description: "Memorial sites, museums, political memory, and civic remembrance.",
  },
  "urban-form-and-everyday-life": {
    label: "Urban form and everyday life",
    description: "Streets, wards, housing fabric, thresholds, and lived urban patterns.",
  },
};

export function isEraLensId(value: string): value is EraLensId {
  return ERA_LENS_IDS.includes(value as EraLensId);
}

export function isInterpretationLensId(value: string): value is InterpretationLensId {
  return INTERPRETATION_LENS_IDS.includes(value as InterpretationLensId);
}
