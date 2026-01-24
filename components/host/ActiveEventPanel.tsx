"use client";

import React, { useMemo, useState } from "react";

type ActiveEvent = {
  id: string;
  event_code: string;
  status: "active" | "scheduled" | "completed" | string;
  name: string | null;
  start_at: string | null;
  config_key: string | null;
};

type EventGamesRow = {
  game_number: number; // 1..6
  playlist_key: string;
  display_mode: "title" | "artist" | null;
  pattern_id: number | null;
};

type BonusRow = {
  playlist_key: string;
  display_mode: "title" | "artist" | null;
};

// Accept whatever the page passes (so TS never blocks the build),
// but still type the props we actually use.
type ActiveEventPanelProps = {
  loading: boolean;

  venueSlug: string;
  venueNameDisplay?: string;

  activeEvent: ActiveEvent | null;

  // optional urls / names
  activeEventDisplayName?: string;
  activePlayerWelcomeUrl?: string;
  activeHowToPlayUrl?: string;
  activeEventUrl?: string;

  formatStartAt?: (startAtIso: string | null | undefined) => string;

  onRefresh: () => void;
  onEndEvent: () => void;
} & Record<string, unknown>;

function safeString(x: unknown) {
  return typeof x === "string" ? x : "";
}

async function copyToClipboard(text: string) {
  const t = (text || "").trim();
  if (!t) return false;

  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    // Fallback (older browsers / some http contexts)
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ActiveEventPanel(props: ActiveEventPanelProps) {
  const {
    loading,
    venueSlug,
    activeEvent,
    onRefresh,
    onEndEvent,
    formatStartAt,
  } = props;

  const venueNameDisplay =
    safeString((props as any).venueNameDisplay) || venueSlug || "Venue";

  const activeEventDisplayName =
    safeString(props.activeEventDisplayName) ||
    activeEvent?.name ||
    venueNameDisplay ||
    "Tonight’s Event";

  const activePlayerWelcomeUrl = safeString(props.activePlayerWelcomeUrl);
  const activeHowToPlayUrl = safeString(props.activeHowToPlayUrl);
  const activeEventUrl = safeString(props.activeEventUrl);

  const startLabel = useMemo(() => {
    if (!activeEvent?.start_at) return "";
    if (typeof formatStartAt === "function")
      return formatStartAt(activeEvent.start_at);
    // fallback: show raw ISO
    return activeEvent.start_at;
  }, [activeEvent?.start_at, formatStartAt]);

  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configErr, setConfigErr] = useState<string | null>(null);
  const [configData, setConfigData] = useState<{
    games: EventGamesRow[];
    bonus: BonusRow | null;
  } | null>(null);

  const handleCopy = async (label: string, url: string) => {
    const ok = await copyToClipboard(url);
    setCopyMsg(ok ? `${label} copied.` : `Couldn't copy ${label}.`);
    window.setTimeout(() => setCopyMsg(null), 1500);
  };

  const handleEndEvent = () => {
    if (!activeEvent) return;
    const ok = window.confirm(
      `End the active event?\n\n${activeEventDisplayName}\n${activeEvent.event_code}`,
    );
    if (!ok) return;
    onEndEvent();
  };

  async function loadActiveConfig() {
    if (!activeEvent?.event_code) return;

    setConfigErr(null);
    setConfigLoading(true);

    try {
      const res = await fetch("/api/host/events/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          venueSlug,
          eventCode: activeEvent.event_code,
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        games?: EventGamesRow[];
        bonus?: BonusRow | null;
      } | null;

      if (!res.ok || !json || json.ok === false) {
        const msg =
          json?.error ||
          (res.status === 404
            ? "Config endpoint not found (safe to ignore unless you need this button)."
            : `Failed to load config (${res.status}).`);
        setConfigErr(msg);
        setConfigData(null);
        return;
      }

      const rawGames = Array.isArray(json.games) ? json.games : [];

      // If backend ever returns game 6 inside `games`, treat that as bonus too.
      const bonusFromGames =
        rawGames.find((g) => Number(g.game_number) === 6) ?? null;

      const bonus =
        (json.bonus && (json.bonus as any).playlist_key ? json.bonus : null) ||
        (bonusFromGames?.playlist_key
          ? {
              playlist_key: String(bonusFromGames.playlist_key),
              display_mode: (bonusFromGames.display_mode ?? "title") as
                | "title"
                | "artist",
            }
          : null);

      // Only show games 1–5 in the “Configured Games” list
      const games = rawGames.filter(
        (g) => Number(g.game_number) >= 1 && Number(g.game_number) <= 5,
      );

      setConfigData({ games, bonus });
    } catch (e) {
      setConfigErr(e instanceof Error ? e.message : "Failed to load config.");
      setConfigData(null);
    } finally {
      setConfigLoading(false);
    }
  }

  const handleToggleConfig = async () => {
    const next = !showConfig;
    setShowConfig(next);

    // IMPORTANT: always re-fetch when opening so we never show stale data
    if (next) {
      await loadActiveConfig();
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Tonight’s Event</h2>
          <div className="mt-1 text-sm text-slate-200">
            <div className="font-semibold truncate">
              {activeEventDisplayName}
            </div>
            {activeEvent?.event_code ? (
              <div className="text-slate-300">
                <span className="font-mono">{activeEvent.event_code}</span>
                {startLabel ? (
                  <span className="ml-2">• {startLabel}</span>
                ) : null}
              </div>
            ) : (
              <div className="text-slate-300">
                {loading ? "Loading…" : "No active event for this venue."}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-md text-xs font-semibold border border-white/15 bg-white/10 hover:bg-white/15 transition"
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={handleEndEvent}
            className="px-3 py-1.5 rounded-md text-xs font-semibold border border-red-700 bg-red-900/60 text-red-100 hover:bg-red-900 transition"
            disabled={loading || !activeEvent}
          >
            End Event
          </button>
        </div>
      </div>

      {/* Links + copy buttons */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs font-semibold text-slate-200">
            Welcome Page
          </div>
          <div className="mt-2 flex items-center gap-2">
            {activePlayerWelcomeUrl ? (
              <>
                <a
                  href={activePlayerWelcomeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline text-slate-100 hover:text-white truncate"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy("Welcome URL", activePlayerWelcomeUrl)
                  }
                  className="px-2 py-1 rounded-md text-[11px] font-semibold border border-white/15 bg-white/10 hover:bg-white/15 transition"
                >
                  Copy
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-400">—</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs font-semibold text-slate-200">
            How To Play
          </div>
          <div className="mt-2 flex items-center gap-2">
            {activeHowToPlayUrl ? (
              <>
                <a
                  href={activeHowToPlayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline text-slate-100 hover:text-white truncate"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy("How To Play URL", activeHowToPlayUrl)
                  }
                  className="px-2 py-1 rounded-md text-[11px] font-semibold border border-white/15 bg-white/10 hover:bg-white/15 transition"
                >
                  Copy
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-400">—</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs font-semibold text-slate-200">Event Page</div>
          <div className="mt-2 flex items-center gap-2">
            {activeEventUrl ? (
              <>
                <a
                  href={activeEventUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline text-slate-100 hover:text-white truncate"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy("Event URL", activeEventUrl)}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold border border-white/15 bg-white/10 hover:bg-white/15 transition"
                >
                  Copy
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-400">—</div>
            )}
          </div>
        </div>
      </div>

      {copyMsg ? (
        <div className="mt-2 text-xs text-slate-300">{copyMsg}</div>
      ) : null}

      {/* Game Configuration button for Active Event */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-300">
          {activeEvent ? (
            <>
              Venue:{" "}
              <span className="font-semibold text-slate-100">
                {venueNameDisplay}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleConfig}
            className="px-3 py-1.5 rounded-md text-xs font-semibold border border-blue-700 bg-blue-900/60 text-blue-100 hover:bg-blue-900 transition"
            disabled={!activeEvent}
          >
            {showConfig ? "Hide Configuration" : "Game Configuration"}
          </button>

          {showConfig ? (
            <button
              type="button"
              onClick={loadActiveConfig}
              className="px-3 py-1.5 rounded-md text-xs font-semibold border border-white/15 bg-white/10 text-slate-100 hover:bg-white/15 transition"
              disabled={!activeEvent || configLoading}
              title="Reload configuration"
            >
              Reload
            </button>
          ) : null}
        </div>
      </div>

      {showConfig ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
          {configLoading ? (
            <div className="text-sm text-slate-200">Loading configuration…</div>
          ) : configErr ? (
            <div className="text-sm text-red-200">{configErr}</div>
          ) : configData ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-white">
                Configured Games
              </div>

              {configData.games.length ? (
                <ul className="space-y-1 text-sm text-slate-200">
                  {configData.games
                    .slice()
                    .sort((a, b) => a.game_number - b.game_number)
                    .map((g) => (
                      <li
                        key={g.game_number}
                        className="flex flex-wrap gap-x-3 gap-y-1"
                      >
                        <span className="font-semibold">
                          Game {g.game_number}
                        </span>
                        <span className="font-mono">{g.playlist_key}</span>
                        <span className="uppercase text-xs text-slate-300">
                          {g.display_mode ?? "title"}
                        </span>
                        <span className="text-xs text-slate-300">
                          Pattern: {g.pattern_id ?? "—"}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-300">
                  No game rows returned.
                </div>
              )}

              <div className="pt-2 border-t border-white/10">
                <div className="text-sm font-semibold text-white">
                  Bonus Game
                </div>
                {configData.bonus?.playlist_key ? (
                  <div className="mt-1 text-sm text-slate-200 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="font-mono">
                      {configData.bonus.playlist_key}
                    </span>
                    <span className="uppercase text-xs text-slate-300">
                      {configData.bonus.display_mode ?? "title"}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-slate-300">
                    No bonus configured.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-300">
              No configuration loaded yet.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
