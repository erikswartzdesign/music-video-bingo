"use client";

import { useEffect, useMemo, useState } from "react";

import type { DisplayMode } from "@/lib/eventConfig";
import type {
  DbPatternRow,
  HostGameForm,
  PlaylistOption,
} from "@/lib/host/types";
import SectionDivider from "@/components/host/SectionDivider";

type Props = {
  venueSlug: string;
  venueNameDisplay: string;

  eventDate: string;
  setEventDate: (v: string) => void;

  configKey: string;
  setConfigKey: (v: string) => void;

  eventName: string;
  setEventName: (v: string) => void;

  games: HostGameForm[];
  onResetDefaults: () => void;
  onUpdateGame: (
    gameNumber: HostGameForm["gameNumber"],
    patch: Partial<HostGameForm>,
  ) => void;

  patterns: DbPatternRow[];
  patternsById: Record<number, string>;
  playlistOptions: PlaylistOption[];

  // Bonus ("" = none)
  bonusPlaylistKey: string;
  setBonusPlaylistKey: (v: string) => void;
  bonusDisplayMode: DisplayMode;
  setBonusDisplayMode: (v: DisplayMode) => void;

  onCreateAndActivate: () => void;
};

type PatternWithCells = {
  id: number;
  name: string;
  cells: number[];
};

type PatternsApiResponse =
  | { ok: true; patterns: PatternWithCells[] }
  | { ok: false; error: string };

function MiniGrid({ highlighted }: { highlighted: Set<number> }) {
  // Cells are 1..25 left-to-right, top-to-bottom
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 25 }).map((_, idx) => {
        const cellNum = idx + 1;
        const isOn = highlighted.has(cellNum);

        return (
          <div
            key={cellNum}
            className={[
              "aspect-square rounded-sm border",
              isOn
                ? "border-emerald-300/60 bg-emerald-400/30"
                : "border-white/10 bg-black/25",
            ].join(" ")}
            title={String(cellNum)}
          />
        );
      })}
    </div>
  );
}

export default function CreateActivateEventCard({
  venueSlug,
  venueNameDisplay,
  eventDate,
  setEventDate,
  configKey,
  setConfigKey,
  eventName,
  setEventName,
  games,
  onResetDefaults,
  onUpdateGame,
  patterns,
  patternsById,
  playlistOptions,
  bonusPlaylistKey,
  setBonusPlaylistKey,
  bonusDisplayMode,
  setBonusDisplayMode,
  onCreateAndActivate,
}: Props) {
  const bonusEnabled = Boolean(String(bonusPlaylistKey || "").trim());

  const [isPatternPreviewOpen, setIsPatternPreviewOpen] = useState(false);
  const [isPatternGalleryOpen, setIsPatternGalleryOpen] = useState(false);

  const games1to5 = useMemo(() => {
    return [...games]
      .filter((g) => g.gameNumber >= 1 && g.gameNumber <= 5)
      .sort((a, b) => a.gameNumber - b.gameNumber);
  }, [games]);

  const [patternsWithCells, setPatternsWithCells] = useState<
    PatternWithCells[]
  >([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsError, setPatternsError] = useState<string | null>(null);

  const patternCellsById = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const p of patternsWithCells) {
      map.set(p.id, new Set(p.cells ?? []));
    }
    return map;
  }, [patternsWithCells]);

  // Single shared loader (used for prefetch and modal open)
  async function loadPatternsIfNeeded() {
    if (patternsWithCells.length > 0) return;

    setPatternsLoading(true);
    setPatternsError(null);

    try {
      const res = await fetch("/api/host/patterns", { method: "GET" });
      const json = (await res.json()) as PatternsApiResponse;

      if (!res.ok || !json.ok) {
        const msg =
          "ok" in json && json.ok === false
            ? json.error
            : `Request failed (${res.status})`;
        setPatternsError(msg);
        setPatternsWithCells([]);
        return;
      }

      setPatternsWithCells(json.patterns ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setPatternsError(msg);
      setPatternsWithCells([]);
    } finally {
      setPatternsLoading(false);
    }
  }

  // NEW: prefetch on page load (patterns are static)
  useEffect(() => {
    // fire-and-forget (state updates happen when done)
    void loadPatternsIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also ensure patterns are loaded when either modal opens (covers slow/failed prefetch)
  const shouldLoadPatterns = isPatternPreviewOpen || isPatternGalleryOpen;

  useEffect(() => {
    if (!shouldLoadPatterns) return;
    void loadPatternsIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoadPatterns]);

  return (
    <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold">Create & Activate Event</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPatternGalleryOpen(true)}
            className="px-3 py-2 rounded-md text-xs font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
          >
            All Patterns
          </button>

          <button
            type="button"
            onClick={() => setIsPatternPreviewOpen(true)}
            className="px-3 py-2 rounded-md text-xs font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
          >
            Verify Patterns
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Event code becomes:{" "}
            <span className="font-mono">{venueSlug}--YYYY-MM-DD</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Config Key (legacy fallback)
          </label>
          <input
            value={configKey}
            onChange={(e) => setConfigKey(e.target.value)}
            className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
            placeholder="optional (e.g. dec-22-2025)"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            If DB games exist, this is not used by players.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Optional Event Name
          </label>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
            placeholder={`Defaults to "${venueNameDisplay} — ${eventDate}"`}
          />
        </div>
      </div>

      <SectionDivider />

      {/* Game setup */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-md font-semibold">Game Setup (DB-driven)</h3>
          <button
            type="button"
            onClick={onResetDefaults}
            className="px-3 py-2 rounded-md text-xs font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
          >
            Reset Defaults
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {games.map((g) => (
            <div
              key={g.gameNumber}
              className="rounded-lg border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    Game {g.gameNumber}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Pattern optional (Games 1–5)
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Playlist */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Choose Playlist
                    </label>
                    <select
                      value={g.playlistKey ?? ""}
                      onChange={(e) =>
                        onUpdateGame(g.gameNumber, {
                          playlistKey: e.target.value,
                        })
                      }
                      className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {playlistOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} ({opt.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Choose Artist or Title
                    </label>
                    <select
                      value={g.displayMode ?? ""}
                      onChange={(e) =>
                        onUpdateGame(g.gameNumber, {
                          displayMode: e.target.value as DisplayMode,
                        })
                      }
                      className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option value="title">Title</option>
                      <option value="artist">Artist</option>
                    </select>
                  </div>

                  {/* Pattern */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Choose Pattern
                    </label>
                    <select
                      value={g.patternId ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const next = raw === "" ? null : Number(raw);
                        onUpdateGame(g.gameNumber, {
                          patternId: next,
                        });
                      }}
                      className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option value="">No Pattern</option>
                      {patterns.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id})
                        </option>
                      ))}
                    </select>

                    {g.patternId ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Selected:{" "}
                        <span className="font-mono">
                          {patternsById[g.patternId] ??
                            `Pattern ${g.patternId}`}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BONUS GAME (after Game 5) */}
      <div className="mt-6 rounded-lg border border-orange-300/25 bg-orange-400/50 p-4 ring-1 ring-orange-200/10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Bonus Game</div>
          <div className="text-[11px] text-slate-400">Optional</div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Choose Playlist
            </label>
            <select
              value={bonusPlaylistKey ?? ""}
              onChange={(e) => setBonusPlaylistKey(e.target.value)}
              className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
            >
              <option value="" disabled>
                Select
              </option>
              <option value="">No Bonus</option>
              {playlistOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.id})
                </option>
              ))}
            </select>

            {!bonusEnabled ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Choose a bonus playlist to enable mode.
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Choose Artist or Title
            </label>
            <select
              value={bonusEnabled ? bonusDisplayMode : ""}
              onChange={(e) =>
                setBonusDisplayMode(e.target.value as DisplayMode)
              }
              disabled={!bonusEnabled}
              className={[
                "w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70",
                !bonusEnabled ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <option value="" disabled>
                Select
              </option>
              <option value="title">Title</option>
              <option value="artist">Artist</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onCreateAndActivate}
          disabled={!venueSlug}
          className={[
            "inline-flex items-center justify-center px-4 py-3 rounded-md text-sm font-semibold shadow-md transition",
            "bg-emerald-500 text-black hover:bg-emerald-400",
            !venueSlug ? "opacity-60 pointer-events-none" : "",
          ].join(" ")}
        >
          Create & Activate Tonight
        </button>
      </div>

      {/* Verify Patterns Modal */}
      {isPatternPreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close pattern verify"
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsPatternPreviewOpen(false)}
          />

          <div className="relative w-full max-w-6xl rounded-xl border border-white/15 bg-slate-950/95 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-sm font-semibold">Verify Patterns</div>
                <div className="text-[11px] text-slate-400">
                  Preview selected patterns for Games 1–5 (no player data).
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPatternPreviewOpen(false)}
                className="px-3 py-2 rounded-md text-xs font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              {patternsLoading ? (
                <div className="text-sm text-slate-200">Loading patterns…</div>
              ) : patternsError ? (
                <div className="text-sm text-red-200">
                  Could not load patterns:{" "}
                  <span className="font-mono">{patternsError}</span>
                </div>
              ) : (
                <>
                  {/* NEW: legend */}
                  <div className="text-[11px] text-slate-400">
                    Green squares represent the winning pattern.
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {games1to5.map((g) => {
                      const patternName = g.patternId
                        ? (patternsById[g.patternId] ??
                          `Pattern ${g.patternId}`)
                        : "No Pattern";

                      const highlighted =
                        g.patternId && patternCellsById.has(g.patternId)
                          ? (patternCellsById.get(g.patternId) as Set<number>)
                          : new Set<number>();

                      return (
                        <div
                          key={g.gameNumber}
                          className="rounded-lg border border-white/10 bg-black/25 p-4"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-100">
                              Game {g.gameNumber}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {patternName}
                            </div>
                          </div>

                          <div className="mt-3">
                            <MiniGrid highlighted={highlighted} />
                          </div>

                          <div className="mt-3 text-[11px] text-slate-400">
                            Playlist:{" "}
                            <span className="font-mono">
                              {g.playlistKey ? g.playlistKey : "—"}
                            </span>
                            <br />
                            Mode:{" "}
                            <span className="font-mono">
                              {g.displayMode ? g.displayMode : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-[11px] text-slate-400">
                    Tip: choose a pattern in the form and re-open this modal to
                    see the highlight update.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* All Patterns Modal */}
      {isPatternGalleryOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close pattern gallery"
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsPatternGalleryOpen(false)}
          />

          <div className="relative w-full h-full max-w-7xl rounded-xl border border-white/15 bg-slate-950/95 shadow-2xl backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-sm font-semibold">All Patterns</div>
                <div className="text-[11px] text-slate-400">
                  Reference gallery for choosing patterns.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPatternGalleryOpen(false)}
                className="px-3 py-2 rounded-md text-xs font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
              >
                Close
              </button>
            </div>

            <div className="p-5 flex-1 overflow-auto">
              {patternsLoading ? (
                <div className="text-sm text-slate-200">Loading patterns…</div>
              ) : patternsError ? (
                <div className="text-sm text-red-200">
                  Could not load patterns:{" "}
                  <span className="font-mono">{patternsError}</span>
                </div>
              ) : (
                <>
                  <div className="text-[11px] text-slate-400">
                    Green squares represent the winning pattern.
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {patternsWithCells.map((p) => {
                      const highlighted =
                        patternCellsById.get(p.id) ?? new Set<number>();

                      return (
                        <div
                          key={p.id}
                          className="rounded-lg border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-100">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              #{p.id}
                            </div>
                          </div>

                          <div className="mt-3">
                            <MiniGrid highlighted={highlighted} />
                          </div>

                          <div className="mt-3 text-[11px] text-slate-400">
                            Cells:{" "}
                            <span className="font-mono">
                              {(p.cells ?? []).join(", ")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {patternsWithCells.length === 0 ? (
                    <div className="mt-4 text-sm text-slate-300">
                      No patterns returned.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
