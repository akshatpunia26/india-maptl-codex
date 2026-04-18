"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { Place } from "@/lib/mock/types";
import { CityContext, Curiosity, JourneyConcept, RouteData, StoryPack, WalkCandidatePlace } from "@/lib/walk/types";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), { ssr: false });

type Stage = "page-1" | "page-2" | "page-3" | "page-4";

const durationOptions = ["90 min", "2 hours", "3 hours"];
const curiosityOptions: Curiosity[] = ["power", "sacred", "markets", "architecture", "ruins", "river", "old city", "surprise me"];

function asPlaces(stops: WalkCandidatePlace[]): Place[] {
  return stops.map((stop) => ({
    id: stop.id,
    title: stop.title,
    lat: stop.lat,
    lng: stop.lng,
    era: stop.chronologyLabel,
    themeTags: [stop.siteType],
    blurb: stop.historicalSummary,
    dateLabel: stop.chronologyLabel,
    iconKey: "archive",
  }));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload as T;
}

export function AppShell() {
  const [stage, setStage] = useState<Stage>("page-1");
  const [city, setCity] = useState("Agra");
  const [duration, setDuration] = useState("2 hours");
  const [curiosity, setCuriosity] = useState<Curiosity>("power");
  const [cityContext, setCityContext] = useState<CityContext | null>(null);
  const [journeys, setJourneys] = useState<JourneyConcept[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<JourneyConcept | null>(null);
  const [orderedStops, setOrderedStops] = useState<WalkCandidatePlace[]>([]);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [storyPack, setStoryPack] = useState<StoryPack | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [askInput, setAskInput] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [trivia, setTrivia] = useState<Array<{ type: string; text: string }>>([]);
  const [token, setToken] = useState<{ tokenTitle: string; unlockLine: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem("maptl-v3");
    if (!stored) return null;
    return JSON.parse(stored).token ?? null;
  });
  const [storyCard, setStoryCard] = useState<{ hook: string; closingLine: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem("maptl-v3");
    if (!stored) return null;
    return JSON.parse(stored).storyCard ?? null;
  });
  const [narration, setNarration] = useState<string | null>(null);

  const currentStop = orderedStops[activeStopIndex];
  const currentNarrative = storyPack?.stopNarratives.find((stop) => stop.stopId === currentStop?.id);


  useEffect(() => {
    localStorage.setItem("maptl-v3", JSON.stringify({ token, storyCard }));
  }, [token, storyCard]);

  const walkContext = useMemo(() => {
    if (!selectedJourney || !storyPack || !routeData || !cityContext) return null;
    return { city: cityContext.city, journey: selectedJourney, orderedStops, routeData, storyPack };
  }, [cityContext, orderedStops, routeData, selectedJourney, storyPack]);

  const runFindJourneys = async () => {
    setLoading("city");
    setStatus(null);
    try {
      const context = await postJson<CityContext>("/api/walk/city-context", { city, duration, curiosity });
      const journeyResult = await postJson<{ journeys: JourneyConcept[] }>("/api/walk/journeys", {
        city: context.city,
        curiosity: context.resolvedCuriosity,
        duration,
        candidates: context.candidates,
      });
      setCityContext(context);
      setJourneys(journeyResult.journeys);
      setStage("page-2");
      if (context.curiosityReason) setStatus(context.curiosityReason);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not build city context.");
    } finally {
      setLoading(null);
    }
  };

  const previewJourney = async (journey: JourneyConcept) => {
    if (!cityContext) return;
    setLoading("preview");
    try {
      const preview = await postJson<{ orderedStops: WalkCandidatePlace[]; route: RouteData }>("/api/walk/preview", {
        journey,
        candidates: cityContext.candidates,
      });
      setSelectedJourney(journey);
      setOrderedStops(preview.orderedStops);
      setRouteData(preview.route);
      setStage("page-3");
    } finally {
      setLoading(null);
    }
  };

  const generateWalk = async () => {
    if (!selectedJourney || !routeData) return;
    setLoading("story");
    const result = await postJson<{ storyPack: StoryPack }>("/api/walk/generate", { journey: selectedJourney, orderedStops, routeData });
    setStoryPack(result.storyPack);
    setStage("page-4");
    setActiveStopIndex(0);
    setLoading(null);
  };

  const mapDestination = cityContext
    ? { canonicalLabel: cityContext.city, label: cityContext.city, center: cityContext.center, displayContext: "India", placeType: "place", mapboxId: cityContext.normalizedCity, bounds: cityContext.bounds, zoom: 12 }
    : null;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[1600px] p-3 md:p-4">
      <header className="panel-soft mb-3 flex items-center justify-between rounded-2xl px-4 py-3">
        <div>
          <p className="text-2xl font-black tracking-tight">maptl</p>
          <p className="text-xs text-[#6f6557]">maptl turns any Indian city into a guided historical walk built from what still stands.</p>
        </div>
      </header>

      {status ? <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{status}</div> : null}

      {stage === "page-1" ? (
        <section className="grid gap-3 lg:grid-cols-[420px_1fr]">
          <div className="panel-surface rounded-3xl p-5">
            <h1 className="text-3xl font-black tracking-tight">pick a city</h1>
            <p className="mt-2 text-sm text-[#6f6557]">start anywhere in india. we begin with places that still stand and can still be mapped.</p>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-4 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" placeholder="Agra" />
            <div className="mt-4 flex flex-wrap gap-2">{durationOptions.map((option) => <button key={option} onClick={() => setDuration(option)} className={`rounded-full px-3 py-1.5 text-sm ${duration === option ? "bg-[#1f1a14] text-white" : "bg-white border border-[var(--line)]"}`}>{option}</button>)}</div>
            <div className="mt-4 flex flex-wrap gap-2">{curiosityOptions.map((option) => <button key={option} onClick={() => setCuriosity(option)} className={`rounded-full px-3 py-1.5 text-sm capitalize ${curiosity === option ? "bg-[#f1e7d8] border border-[#9b7b4e]" : "bg-white border border-[var(--line)]"}`}>{option}</button>)}</div>
            <button onClick={runFindJourneys} className="mt-5 w-full rounded-xl bg-[#1f1a14] px-4 py-2.5 font-semibold text-white">{loading === "city" ? "finding..." : "find story-walks"}</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["pick a city", "start anywhere in india. we begin with places that still stand and can still be mapped."],
              ["choose what pulls you in", "power, sacred life, markets, ruins, architecture, river, old city. the same city opens differently depending on what you follow."],
              ["get a walk that makes sense", "we turn nearby surviving places into one clear route. not a list of pins, but a walk with shape."],
              ["leave with a keepsake", "finish with a city token and a shareable story card. something to keep after the walk ends."],
            ].map(([title, body]) => (
              <article key={title} className="panel-surface rounded-3xl p-5">
                <h3 className="text-lg font-bold capitalize">{title}</h3>
                <p className="mt-2 text-sm text-[#6f6557]">{body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {stage === "page-2" && cityContext ? (
        <section>
          <p className="mb-3 text-sm text-[#6f6557]">these are the strongest surviving threads this city can still tell on the ground.</p>
          <div className="grid gap-3 lg:grid-cols-3">
            {journeys.map((journey) => {
              const stopCount = journey.candidateStopIds.length;
              return (
                <article key={journey.id} className="panel-surface rounded-3xl p-4">
                  <h3 className="text-xl font-black capitalize">{journey.title}</h3>
                  <p className="mt-1 text-sm text-[#6f6557]">{journey.hook}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white p-2">{stopCount} stops</div>
                    <div className="rounded-lg bg-white p-2">confidence {Math.round(journey.confidence * 100)}%</div>
                  </div>
                  <p className="mt-3 text-sm text-[#4e463c]">{journey.rationale}</p>
                  <div className="mt-3 h-20 rounded-xl bg-[linear-gradient(180deg,#ede6da_0%,#f8f5ef_100%)]" />
                  <button onClick={() => previewJourney(journey)} className="mt-3 w-full rounded-xl bg-[#1f1a14] px-3 py-2 text-sm font-semibold text-white">preview walk</button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {stage === "page-3" && cityContext && selectedJourney && routeData && mapDestination ? (
        <section className="grid gap-3 lg:grid-cols-[380px_1fr]">
          <div className="panel-surface rounded-3xl p-5">
            <p className="text-xs uppercase tracking-wide text-[#8a7e6f]">one route. one thread. only places that still stand.</p>
            <h2 className="mt-2 text-2xl font-black capitalize">{selectedJourney.title}</h2>
            <p className="mt-2 text-sm text-[#6f6557]">{selectedJourney.hook}</p>
            <ol className="mt-4 space-y-2">{orderedStops.map((stop, index) => <li key={stop.id} className="rounded-xl bg-white p-3 text-sm"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f1e7d8]">{index + 1}</span>{stop.title}</li>)}</ol>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-white p-2">{routeData.totalDistanceKm} km</div>
              <div className="rounded-lg bg-white p-2">{routeData.totalTimeMin} min walk</div>
              <div className="rounded-lg bg-white p-2">{Math.max(6, orderedStops.length * 2)} min read/listen</div>
            </div>
            <button onClick={generateWalk} className="mt-4 w-full rounded-xl bg-[#1f1a14] px-3 py-2 text-sm font-semibold text-white">{loading === "story" ? "generating..." : "generate walk"}</button>
          </div>
          <div className="panel-surface h-[60dvh] min-h-[420px] rounded-3xl p-2">
            <MapCanvas destination={mapDestination} places={asPlaces(orderedStops)} activePlaceId={orderedStops[0]?.id} routeCoordinates={routeData.routeCoordinates} showRoute showMarkers showLabels compact={false} enableFocusFly />
          </div>
        </section>
      ) : null}

      {stage === "page-4" && cityContext && selectedJourney && routeData && storyPack && mapDestination ? (
        <section className="grid gap-3 lg:grid-cols-[420px_1fr]">
          <div className="panel-surface order-2 max-h-[65dvh] overflow-auto rounded-3xl p-4 lg:order-1">
            <h2 className="text-2xl font-black capitalize">{storyPack.walkTitle}</h2>
            <p className="mt-2 text-sm text-[#6f6557]">{storyPack.walkIntro}</p>
            {currentStop && currentNarrative ? (
              <article className="mt-4 rounded-2xl bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentStop.image.thumbUrl} alt={currentStop.title} className="h-40 w-full rounded-xl object-cover" />
                <h3 className="mt-3 text-lg font-bold">{currentStop.title}</h3>
                <p className="mt-2 text-sm"><strong>why this stop matters:</strong> {currentNarrative.whyThisStopMatters}</p>
                <p className="mt-2 text-sm"><strong>what to notice now:</strong> {currentNarrative.whatToNoticeNow}</p>
                <p className="mt-2 text-sm"><strong>how it connects:</strong> {currentNarrative.threadConnection}</p>
                <p className="mt-2 text-xs text-[#6f6557]">sources: {currentStop.evidenceUrls.join(" · ")}</p>
                <p className="mt-2 text-sm text-[#4e463c]">{currentNarrative.transitionToNext}</p>
              </article>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setActiveStopIndex((index) => Math.max(0, index - 1))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">previous</button>
              <button onClick={() => setActiveStopIndex((index) => Math.min(orderedStops.length - 1, index + 1))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">next</button>
              <button onClick={async () => walkContext && setTrivia((await postJson<{ cards: Array<{ type: string; text: string }> }>("/api/walk/trivia", { walkContext })).cards)} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">trivia</button>
              <button onClick={async () => walkContext && setToken(await postJson("/api/walk/token", { city: cityContext.city, journey: selectedJourney }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">unlock city token</button>
              <button onClick={async () => walkContext && setStoryCard(await postJson("/api/walk/story-card", { walkContext }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">save story card</button>
              <button onClick={async () => walkContext && setNarration((await postJson<{ script: string }>("/api/walk/narration", { walkContext })).script)} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">listen</button>
            </div>

            <div className="mt-3 rounded-xl bg-white p-3">
              <input value={askInput} onChange={(e) => setAskInput(e.target.value)} placeholder="ask this walk" className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5" />
              <button onClick={async () => {
                if (!walkContext || !currentStop || !askInput.trim()) return;
                const answer = await postJson<{ answer: string }>("/api/walk/ask", { question: askInput, walkContext, currentStop: currentStop.id });
                setAskAnswer(answer.answer);
              }} className="mt-2 rounded-lg bg-[#1f1a14] px-3 py-1.5 text-xs text-white">ask this walk</button>
              {askAnswer ? <p className="mt-2 text-sm">{askAnswer}</p> : null}
            </div>

            {trivia.length > 0 ? <div className="mt-3 space-y-2">{trivia.map((card) => <div key={card.type} className="rounded-xl bg-white p-2 text-sm"><strong>{card.type}:</strong> {card.text}</div>)}</div> : null}
            {token ? <p className="mt-3 rounded-xl bg-[#f1e7d8] p-2 text-sm font-semibold">{token.tokenTitle} — {token.unlockLine}</p> : null}
            {storyCard ? <p className="mt-2 rounded-xl bg-white p-2 text-sm">{storyCard.hook} / {storyCard.closingLine}</p> : null}
            {narration ? <p className="mt-2 rounded-xl bg-white p-2 text-sm">{narration}</p> : null}
          </div>

          <div className="panel-surface order-1 h-[58dvh] min-h-[380px] rounded-3xl p-2 lg:order-2 lg:h-[78dvh]">
            <MapCanvas destination={mapDestination} places={asPlaces(orderedStops)} activePlaceId={currentStop?.id} routeCoordinates={routeData.routeCoordinates} showRoute showMarkers showLabels enableFocusFly compact={false} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
