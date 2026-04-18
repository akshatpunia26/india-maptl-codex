import { PersistedJourneyState } from "@/lib/journey/types";

const STORAGE_KEY = "maptl-browser-state-v2";

export function loadPersistedJourneyState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedJourneyState;
    if (parsed?.version !== 2) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function savePersistedJourneyState(state: PersistedJourneyState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
