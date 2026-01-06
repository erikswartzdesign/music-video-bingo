"use client";

import type { DisplayMode } from "@/lib/eventConfig";
import type { DbPatternRow, HostGameForm, PlaylistOption } from "@/lib/host/types";
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
  onUpdateGame: (gameNumber: HostGameForm["gameNumber"], patch: Partial<HostGameForm>) => void;

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
  const canSubmit = Boolean(String(venueSlug || "").trim());

  return (
    <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-lg">
      <h2 className="text-lg font-semibold">Create & Activate Event</h2>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Event code becomes: <span className="font-mono">{venueSlug}--YYYY-MM-DD</span>
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
            <div key={g.gameNumber} className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Game {g.gameNumber}</div>
                  {g.gameNumber === 1 ? (
                    <div className="text-[11px] text-slate-400">No pattern for Game 1</div>
                  ) : (
                    <div className="text-[11px] text-slate-400">Pattern optional (Games 2–5)</div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Playlist */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Playlist</label>
                    <select
                      value={g.playlistKey}
                      onChange={(e) => onUpdateGame(g.gameNumber, { playlistKey: e.target.value })}
                      className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    >
                      {playlistOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} ({opt.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Mode</label>
                    <select
                      value={g.displayMode}
                      onChange={(e) =>
                        onUpdateGame(g.gameNumber, { displayMode: e.target.value as DisplayMode })
                      }
                      className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    >
                      <option value="title">Title</option>
                      <option value="artist">Artist</option>
                    </select>
                  </div>

                  {/* Pattern */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Pattern</label>
                    <select
                      value={g.patternId ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const next = raw === "" ? null : Number(raw);
                        onUpdateGame(g.gameNumber, { patternId: g.gameNumber === 1 ? null : next });
                      }}
                      disabled={g.gameNumber === 1}
                      className={[
                        "w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70",
                        g.gameNumber === 1 ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      <option value="">No Pattern</option>
                      {patterns.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id})
                        </option>
                      ))}
                    </select>

                    {g.gameNumber !== 1 && g.patternId ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Selected:{" "}
                        <span className="font-mono">
                          {patternsById[g.patternId] ?? `Pattern ${g.patternId}`}
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
            <label className="block text-xs font-medium text-slate-300 mb-1">Playlist</label>
            <select
              value={bonusPlaylistKey}
              onChange={(e) => setBonusPlaylistKey(e.target.value)}
              className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
            >
              <option value="">No Bonus</option>
              {playlistOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Mode</label>
            <select
              value={bonusDisplayMode}
              onChange={(e) => setBonusDisplayMode(e.target.value as DisplayMode)}
              disabled={!bonusEnabled}
              className={[
                "w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70",
                !bonusEnabled ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <option value="title">Title</option>
              <option value="artist">Artist</option>
            </select>

            {!bonusEnabled ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Choose a bonus playlist to enable mode.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {/* NOT a <button> — cannot submit/reload */}
        <div
          role="button"
          tabIndex={0}
          aria-disabled={!canSubmit}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!canSubmit) return;
            onCreateAndActivate();
          }}
          onKeyDown={(e) => {
            if (!canSubmit) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onCreateAndActivate();
            }
          }}
          className={[
            "inline-flex items-center justify-center px-4 py-3 rounded-md text-sm font-semibold shadow-md transition select-none",
            "bg-emerald-500 text-black hover:bg-emerald-400",
            !canSubmit ? "opacity-60 pointer-events-none" : "cursor-pointer",
          ].join(" ")}
        >
          Create & Activate Tonight
        </div>
      </div>
    </section>
  );
}
