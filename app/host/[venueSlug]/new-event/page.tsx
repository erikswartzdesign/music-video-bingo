"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type DisplayMode = "title" | "artist";

type GameSetup = {
  gameId: string; // "game1"..."game6"
  label: string; // "Game 1"..."Bonus Game"
  playlistNumber: number; // 1..15
  mode: DisplayMode; // title/artist
  patternId: string; // "none" | "p1".."p15"
};

type HostEvent = {
  id: string;
  venueSlug: string;
  createdAtIso: string;
  eventDate: string; // YYYY-MM-DD
  activeUntilIso: string; // ISO
  games: GameSetup[];
};

function slugToTitle(slug: string) {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function todayLocalYYYYMMDD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// For now (mock): activeUntil = 2:00 AM the next day *in the user’s local timezone*.
// Later: you’ll compute this in a venue-specific timezone server-side.
function computeActiveUntilIso(eventDateYYYYMMDD: string) {
  const [y, m, d] = eventDateYYYYMMDD.split("-").map(Number);
  const end = new Date(y, (m ?? 1) - 1, (d ?? 1) + 1, 2, 0, 0, 0);
  return end.toISOString();
}

function makeStorageKeyActive(venueSlug: string) {
  return `mvb:activeEvent:${venueSlug}`;
}
function makeStorageKeyHistory(venueSlug: string) {
  return `mvb:eventHistory:${venueSlug}`;
}

const PATTERNS: { id: string; name: string }[] = [
  { id: "none", name: "No Pattern" },
  { id: "p1", name: "Pattern 1" },
  { id: "p2", name: "Pattern 2" },
  { id: "p3", name: "Pattern 3" },
  { id: "p4", name: "Pattern 4" },
  { id: "p5", name: "Pattern 5" },
  { id: "p6", name: "Pattern 6" },
  { id: "p7", name: "Pattern 7" },
  { id: "p8", name: "Pattern 8" },
  { id: "p9", name: "Pattern 9" },
  { id: "p10", name: "Pattern 10" },
  { id: "p11", name: "Pattern 11" },
  { id: "p12", name: "Pattern 12" },
  { id: "p13", name: "Pattern 13" },
  { id: "p14", name: "Pattern 14" },
  { id: "p15", name: "Pattern 15" },
];

function defaultGames(): GameSetup[] {
  const base: GameSetup[] = [
    { gameId: "game1", label: "Game 1", playlistNumber: 1, mode: "title", patternId: "none" },
    { gameId: "game2", label: "Game 2", playlistNumber: 2, mode: "artist", patternId: "p1" },
    { gameId: "game3", label: "Game 3", playlistNumber: 3, mode: "title", patternId: "p2" },
    { gameId: "game4", label: "Game 4", playlistNumber: 4, mode: "artist", patternId: "p3" },
    { gameId: "game5", label: "Game 5", playlistNumber: 5, mode: "title", patternId: "p4" },
    { gameId: "game6", label: "Bonus Game", playlistNumber: 6, mode: "artist", patternId: "p5" },
  ];
  return base;
}

export default function NewEventPage() {
  const params = useParams<{ venueSlug?: string }>();
  const router = useRouter();

  const venueSlug = params?.venueSlug ?? "";
  const venueName = useMemo(() => slugToTitle(venueSlug), [venueSlug]);

  const [eventDate, setEventDate] = useState<string>(todayLocalYYYYMMDD());
  const [games, setGames] = useState<GameSetup[]>(defaultGames());
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Clear “saved” notice if anything changes
  useEffect(() => {
    if (savedNotice) setSavedNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDate, games]);

  const activeUntilIso = useMemo(() => computeActiveUntilIso(eventDate), [eventDate]);

  const handleGameChange = (idx: number, patch: Partial<GameSetup>) => {
    setGames((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const handleSave = () => {
    setError(null);

    if (!venueSlug) {
      setError("Missing venue slug.");
      return;
    }

    // Basic validation
    for (const g of games) {
      if (g.playlistNumber < 1 || g.playlistNumber > 15) {
        setError("Playlist number must be between 1 and 15.");
        return;
      }
      if (g.gameId === "game1" && g.patternId !== "none") {
        // You said Game 1 stays traditional bingo
        setError("Game 1 must be set to No Pattern.");
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const id = `evt-${eventDate}-${Math.random().toString(36).slice(2, 8)}`;

    const newEvent: HostEvent = {
      id,
      venueSlug,
      createdAtIso: nowIso,
      eventDate,
      activeUntilIso,
      games,
    };

    // Save active + append to history
    try {
      const activeKey = makeStorageKeyActive(venueSlug);
      const historyKey = makeStorageKeyHistory(venueSlug);

      localStorage.setItem(activeKey, JSON.stringify(newEvent));

      const rawHist = localStorage.getItem(historyKey);
      const hist: HostEvent[] = rawHist ? JSON.parse(rawHist) : [];
      hist.unshift(newEvent);
      localStorage.setItem(historyKey, JSON.stringify(hist));

      setSavedNotice("Saved and activated.");
      // Return to dashboard
      router.push(`/host/${venueSlug}`);
    } catch (e) {
      setError("Failed to save event (local storage error).");
    }
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 px-6 py-10">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/mvb-logo.png"
              alt="Music Video Bingo logo"
              width={520}
              height={160}
              className="h-auto w-80 sm:w-96"
              priority
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold">Create New Event</h1>
          <p className="text-sm text-slate-300 mt-2">
            Venue: <span className="font-semibold text-slate-100">{venueName || venueSlug}</span>{" "}
            <span className="text-xs text-slate-400 font-mono">({venueSlug})</span>
          </p>
        </header>

        <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-lg">
          {/* Top controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
              />
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-slate-200">
                Auto-expire (local for now):{" "}
                <span className="font-mono text-slate-100">{activeUntilIso}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                (Later we’ll compute this with venue timezone on the backend.)
              </p>
            </div>
          </div>

          {/* Game grid */}
          <div className="mt-6">
            <div className="grid grid-cols-1 gap-4">
              {games.map((g, idx) => (
                <div
                  key={g.gameId}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{g.label}</h2>
                      <p className="text-xs text-slate-400">
                        Configure playlist + title/artist + pattern
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
                      {/* Playlist */}
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">
                          Playlist #
                        </label>
                        <select
                          value={g.playlistNumber}
                          onChange={(e) =>
                            handleGameChange(idx, { playlistNumber: Number(e.target.value) })
                          }
                          className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                        >
                          {Array.from({ length: 15 }).map((_, i) => {
                            const n = i + 1;
                            return (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Mode */}
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">
                          Mode
                        </label>
                        <select
                          value={g.mode}
                          onChange={(e) =>
                            handleGameChange(idx, { mode: e.target.value as DisplayMode })
                          }
                          className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                        >
                          <option value="title">Titles</option>
                          <option value="artist">Artists</option>
                        </select>
                      </div>

                      {/* Pattern */}
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">
                          Pattern
                        </label>
                        <select
                          value={g.patternId}
                          onChange={(e) =>
                            handleGameChange(idx, { patternId: e.target.value })
                          }
                          disabled={g.gameId === "game1"}
                          className={[
                            "w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70",
                            g.gameId === "game1" ? "opacity-60 cursor-not-allowed" : "",
                          ].join(" ")}
                        >
                          {PATTERNS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {g.gameId === "game1" && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Game 1 stays traditional bingo.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Errors / actions */}
          <div className="mt-6 space-y-3">
            {error && (
              <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            {savedNotice && (
              <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {savedNotice}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => router.push(`/host/${venueSlug}`)}
                className="px-4 py-3 rounded-md text-sm font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-3 rounded-md text-sm font-semibold bg-emerald-500 text-black shadow-md hover:bg-emerald-400 transition"
              >
                Save & Activate Event
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
