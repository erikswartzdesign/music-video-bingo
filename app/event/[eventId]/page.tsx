"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DisplayMode,
  PlaylistItem,
  GameConfig,
  getEventConfig,
  getPlaylistById,
} from "@/lib/eventConfig";

type CardEntry = {
  playlistItem: PlaylistItem;
  selected: boolean;
};

type BingoCard = {
  id: string;
  entries: CardEntry[];
};

type PersistedStateV1 = {
  v: 1;
  eventId: string; // event_code (URL param)
  selectedGameId: string | null;
  cardsByGameId: Record<string, BingoCard>;
  savedAt: number;
};

type DbEventWithGames = {
  id: string;
  event_code: string;
  name: string | null;
  config_key: string | null;
  event_games?: DbEventGameRow[] | null;
};

type DbEventGameRow = {
  game_number: number;
  playlist_key: string;
  display_mode: "title" | "artist" | null;
  pattern_id: number | null;
};

type DbEventBonusRow = {
  playlist_key: string;
  display_mode: "title" | "artist" | null;
};

type DbPatternRow = {
  id: number;
  name: string;
  cells: number[]; // 1..25 (excluding 13)
};

type LoadState = "loading" | "ready" | "error";

// =============================
// Patterns helper
// Squares are stored 1–25 (left-to-right, top-to-bottom).
// We convert to 0–24 indexes internally.
// FREE (center) is 13 (index 12) and should not appear in cells.
// =============================
function patternCellsToIndexSet(cells1to25: number[] | null | undefined) {
  if (!cells1to25 || !Array.isArray(cells1to25) || cells1to25.length === 0) return null;
  const set = new Set<number>();
  for (const n of cells1to25) {
    const num = Number(n);
    if (!Number.isInteger(num)) continue;
    if (num < 1 || num > 25) continue;
    if (num === 13) continue; // center free
    set.add(num - 1);
  }
  return set.size ? set : null;
}

function generateCardForPlaylist(playlist: PlaylistItem[]): BingoCard {
  const available = [...playlist];

  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  const chosen = available.slice(0, 24);

  const entries: CardEntry[] = [];
  let chosenIndex = 0;

  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      entries.push({
        playlistItem: { id: -1, title: "FREE", artist: "" },
        selected: true,
      });
    } else {
      entries.push({
        playlistItem: chosen[chosenIndex],
        selected: false,
      });
      chosenIndex++;
    }
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entries,
  };
}

function storageKeyForEvent(eventCode: string) {
  return `mvb:playerState:v1:event:${eventCode}`;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeCard(card: BingoCard): BingoCard {
  if (!card || !Array.isArray(card.entries) || card.entries.length !== 25) return card;

  const entries = card.entries.map((e, idx) => {
    if (idx === 12) {
      return {
        playlistItem: { id: -1, title: "FREE", artist: "" },
        selected: true,
      };
    }
    return {
      playlistItem: {
        id: (e?.playlistItem as any)?.id ?? -999,
        title: (e?.playlistItem as any)?.title ?? "",
        artist: (e?.playlistItem as any)?.artist ?? "",
      },
      selected: Boolean((e as any)?.selected),
    };
  });

  return { ...card, entries };
}

function normalizeCardsByGameId(cardsByGameId: Record<string, BingoCard>) {
  const next: Record<string, BingoCard> = {};
  for (const [gameId, card] of Object.entries(cardsByGameId || {})) {
    if (!card || !Array.isArray(card.entries) || card.entries.length !== 25) continue;
    next[gameId] = normalizeCard(card);
  }
  return next;
}

// Extend GameConfig locally
type GameConfigExt = GameConfig & {
  patternId?: number | null; // DB
  patternCells?: number[]; // Local-only
  isBonus?: boolean;
};

type EventConfigExt = {
  id: string;
  name: string;
  games: GameConfigExt[];
};

function buildEventConfigFromDb(
  dbEvent: DbEventWithGames,
  rows: DbEventGameRow[],
  bonus: DbEventBonusRow | null
): EventConfigExt {
  const sorted = [...rows].sort((a, b) => a.game_number - b.game_number);

  const baseGames: GameConfigExt[] = sorted
    .filter((r) => r.game_number >= 1 && r.game_number <= 5)
    .map((r) => {
      const gameId = `game${r.game_number}`;
      return {
        id: gameId,
        name: `Game ${r.game_number}`,
        playlistId: r.playlist_key,
        displayMode: (r.display_mode ?? "title") as DisplayMode,
        patternId: r.pattern_id ?? null,
        patternCells: undefined, // ✅ was null
        isBonus: false,
      };
    });

  const games: GameConfigExt[] = [...baseGames];

  if (bonus?.playlist_key) {
    games.push({
      id: "bonus",
      name: "Bonus Game",
      playlistId: bonus.playlist_key,
      displayMode: (bonus.display_mode ?? "title") as DisplayMode,
      patternId: null,
      patternCells: undefined, // ✅ was null
      isBonus: true,
    });
  }

  return {
    id: dbEvent.event_code,
    name: dbEvent.name ?? "Music Video Bingo",
    games,
  };
}

export default function EventPage() {
  const params = useParams<{ eventId?: string }>();
  const eventCode = params?.eventId ?? "";

  // ✅ Local-first: if a hardcoded event exists for this URL code, use it and bypass Supabase.
  const localEvent = useMemo(() => getEventConfig(eventCode), [eventCode]);
  const useLocalOnly = Boolean(localEvent);

  const [state, setState] = useState<LoadState>("loading");

  const [dbEvent, setDbEvent] = useState<DbEventWithGames | null>(null);
  const [dbGames, setDbGames] = useState<DbEventGameRow[] | null>(null);
  const [dbBonus, setDbBonus] = useState<DbEventBonusRow | null>(null);

  // DB patterns map: id -> row
  const [patternsById, setPatternsById] = useState<Record<number, DbPatternRow>>({});

  // 0) Load event + event_games, THEN load bonus row (DB mode only)
  useEffect(() => {
    let cancelled = false;

    async function loadDbEvent() {
      if (!eventCode) {
        if (!cancelled) {
          setDbEvent(null);
          setDbGames(null);
          setDbBonus(null);
          setState("error");
        }
        return;
      }

      // ✅ Local-only: skip Supabase entirely.
      if (useLocalOnly) {
        if (!cancelled) {
          setDbEvent(null);
          setDbGames(null);
          setDbBonus(null);
          setState("ready");
        }
        return;
      }

      if (!cancelled) setState("loading");

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("events")
          .select(
            `
            id,
            event_code,
            name,
            config_key,
            event_games (
              game_number,
              playlist_key,
              display_mode,
              pattern_id
            )
          `
          )
          .eq("event_code", eventCode)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setDbEvent(null);
          setDbGames(null);
          setDbBonus(null);
          setState("error");
          return;
        }

        const typed = data as DbEventWithGames;
        setDbEvent(typed);

        const games =
          (typed.event_games ?? null)?.map((g) => ({
            game_number: Number((g as any).game_number),
            playlist_key: String((g as any).playlist_key),
            display_mode: ((g as any).display_mode ?? null) as any,
            pattern_id: (g as any).pattern_id ?? null,
          })) ?? null;

        setDbGames(games && games.length > 0 ? games : null);

        try {
          const { data: bonusRow, error: bonusErr } = await supabase
            .from("event_bonus_games")
            .select("playlist_key, display_mode")
            .eq("event_id", typed.id)
            .maybeSingle();

          if (!cancelled) {
            if (!bonusErr && bonusRow?.playlist_key) {
              setDbBonus({
                playlist_key: String(bonusRow.playlist_key),
                display_mode: (bonusRow.display_mode ?? "title") as any,
              });
            } else {
              setDbBonus(null);
            }
          }
        } catch {
          if (!cancelled) setDbBonus(null);
        }

        setState("ready");
      } catch {
        if (cancelled) return;
        setDbEvent(null);
        setDbGames(null);
        setDbBonus(null);
        setState("error");
      }
    }

    loadDbEvent();
    return () => {
      cancelled = true;
    };
  }, [eventCode, useLocalOnly]);

  // 0b) Load patterns from DB (DB mode only)
  useEffect(() => {
    if (useLocalOnly) return;

    let cancelled = false;

    async function loadPatterns() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("patterns")
          .select("id,name,cells")
          .order("id", { ascending: true });

        if (cancelled) return;
        if (error || !data) return;

        const map: Record<number, DbPatternRow> = {};
        for (const row of data as any[]) {
          const id = Number(row.id);
          if (!Number.isInteger(id)) continue;
          map[id] = {
            id,
            name: String(row.name ?? `Pattern ${id}`),
            cells: Array.isArray(row.cells) ? row.cells.map((n: any) => Number(n)) : [],
          };
        }
        setPatternsById(map);
      } catch {
        // non-fatal
      }
    }

    loadPatterns();
    return () => {
      cancelled = true;
    };
  }, [useLocalOnly]);

  const configKey = dbEvent?.config_key ?? null;

  // Prefer Local event by URL; else DB; else legacy config_key mapping
  const eventConfig: EventConfigExt | null = useMemo(() => {
    // ✅ 1) Local-first
    if (localEvent) {
      return {
        id: localEvent.id,
        name: localEvent.name,
        games: localEvent.games.map((g) => ({
          ...g,
          patternId: null,
          patternCells: g.patternCells,
          isBonus: false,
        })),
      };
    }

    // ✅ 2) DB-driven
    if (dbEvent && dbGames && dbGames.length > 0) {
      return buildEventConfigFromDb(dbEvent, dbGames, dbBonus);
    }

    // ✅ 3) Legacy config_key
    if (!configKey) return null;

    const legacy = getEventConfig(configKey);
    if (!legacy) return null;

    return {
      id: legacy.id,
      name: legacy.name,
      games: legacy.games.map((g) => ({
        ...g,
        patternId: null,
        patternCells: g.patternCells,
        isBonus: false,
      })),
    };
  }, [localEvent, dbEvent, dbGames, dbBonus, configKey]);

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [cardsByGameId, setCardsByGameId] = useState<Record<string, BingoCard>>({});

  const hasRestoredRef = useRef(false);
  const lastSavedStringRef = useRef<string>("");

  // 1) Restore from localStorage on eventCode change
  useEffect(() => {
    if (typeof window === "undefined") return;

    hasRestoredRef.current = false;
    lastSavedStringRef.current = "";

    const key = storageKeyForEvent(eventCode);
    const raw = window.localStorage.getItem(key);
    const parsed = safeJsonParse<PersistedStateV1>(raw);

    if (
      parsed &&
      parsed.v === 1 &&
      parsed.eventId === eventCode &&
      parsed.cardsByGameId &&
      typeof parsed.cardsByGameId === "object"
    ) {
      const normalizedCards = normalizeCardsByGameId(parsed.cardsByGameId);
      setCardsByGameId(normalizedCards);
      setSelectedGameId(parsed.selectedGameId ?? null);
      hasRestoredRef.current = true;
    } else {
      setCardsByGameId({});
      setSelectedGameId(null);
      hasRestoredRef.current = true;
    }
  }, [eventCode]);

  // 2) Ensure selectedGameId is set once we have eventConfig
  useEffect(() => {
    if (!eventConfig) return;

    setSelectedGameId((prev) => {
      if (prev && eventConfig.games.some((g) => g.id === prev)) return prev;
      return eventConfig.games[0]?.id ?? null;
    });
  }, [eventConfig]);

  // 3) Generate missing cards, do NOT overwrite restored ones
  useEffect(() => {
    if (!eventConfig) return;
    if (!hasRestoredRef.current) return;

    setCardsByGameId((prev) => {
      const next: Record<string, BingoCard> = { ...prev };

      for (const game of eventConfig.games) {
        if (!next[game.id]) {
          const playlist = getPlaylistById(game.playlistId);
          if (playlist) next[game.id] = generateCardForPlaylist(playlist.items);
        } else {
          next[game.id] = normalizeCard(next[game.id]);
        }
      }

      return next;
    });
  }, [eventConfig]);

  // 4) Save to localStorage whenever state changes (after restore)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasRestoredRef.current) return;
    if (!eventConfig) return;

    const payload: PersistedStateV1 = {
      v: 1,
      eventId: eventCode,
      selectedGameId,
      cardsByGameId: normalizeCardsByGameId(cardsByGameId),
      savedAt: Date.now(),
    };

    const key = storageKeyForEvent(eventCode);
    const json = JSON.stringify(payload);
    if (json === lastSavedStringRef.current) return;
    lastSavedStringRef.current = json;

    try {
      window.localStorage.setItem(key, json);
    } catch {}
  }, [eventCode, eventConfig, selectedGameId, cardsByGameId]);

  // Orientation detection
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window === "undefined") return;
      const { innerWidth, innerHeight } = window;
      setIsLandscape(innerWidth >= innerHeight);
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Loading event…</h1>
          <p className="text-sm text-gray-300">
            <span className="font-mono">{eventCode}</span>
          </p>
        </div>
      </div>
    );
  }

  if (!dbEvent && !eventConfig) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <p className="text-sm text-gray-300">
            This event code is not active or does not exist:
          </p>
          <p className="text-sm text-gray-300">
            <span className="font-mono">{eventCode}</span>
          </p>
          <p className="text-sm text-gray-300">Please rescan the venue QR code.</p>
        </div>
      </div>
    );
  }

  if (!eventConfig) {
    const configKey = dbEvent?.config_key ?? null;

    if (!configKey && !(dbGames && dbGames.length > 0)) {
      return (
        <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Event not configured</h1>
            <p className="text-sm text-gray-300">
              This event has no DB game setup yet, and is missing a config key:
            </p>
            <p className="text-sm text-gray-300">
              <span className="font-mono">{eventCode}</span>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Configuration not found</h1>
          <p className="text-sm text-gray-300">There is no local event configuration for:</p>
          <p className="text-sm text-gray-300">
            <span className="font-mono">{configKey}</span>
          </p>
        </div>
      </div>
    );
  }

  const currentGame: GameConfigExt | undefined = eventConfig.games.find(
    (g) => g.id === selectedGameId
  );

  const currentPlaylist = currentGame ? getPlaylistById(currentGame.playlistId) : null;
  const currentCard = currentGame ? cardsByGameId[currentGame.id] : null;

  const selectedDisplayMode: DisplayMode =
    currentGame?.displayMode ?? currentPlaylist?.displayMode ?? "title";

  const playlistNumber = currentGame?.playlistId?.match(/\d+/)?.[0] ?? null;
  const modeLabel = selectedDisplayMode === "title" ? "Title" : "Artist";

  const patternRow = currentGame?.patternId ? patternsById[currentGame.patternId] : undefined;

  const localPatternSet = patternCellsToIndexSet(currentGame?.patternCells ?? undefined);
  const dbPatternSet = patternCellsToIndexSet(patternRow?.cells ?? undefined);

  const patternSet = useLocalOnly ? localPatternSet : dbPatternSet;
  const isPatternGame = patternSet !== null;

  const handleResetProgress = () => {
    if (typeof window === "undefined") return;
    if (!currentGame) return;

    const ok = window.confirm(
      `Reset your progress for ${currentGame.name}? This will clear your selected squares for this game only, but keep the card entries the same.`
    );
    if (!ok) return;

    setCardsByGameId((prev) => {
      const card = prev[currentGame.id];
      if (!card?.entries || card.entries.length !== 25) return prev;

      const entries = card.entries.map((entry, idx) => {
        if (idx === 12) {
          return {
            playlistItem: { id: -1, title: "FREE", artist: "" },
            selected: true,
          };
        }
        return { ...entry, selected: false };
      });

      return {
        ...prev,
        [currentGame.id]: { ...card, entries },
      };
    });
  };

  const handleToggleSquare = (index: number) => {
    if (!currentGame || !currentCard) return;
    if (index === 12) return;

    setCardsByGameId((prev) => {
      const card = prev[currentGame.id];
      if (!card) return prev;

      const newEntries = card.entries.map((entry, i) =>
        i === index ? { ...entry, selected: !entry.selected } : entry
      );

      return {
        ...prev,
        [currentGame.id]: { ...card, entries: newEntries },
      };
    });
  };

  const headerTitle = dbEvent?.name ?? eventConfig.name;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex flex-col items-center relative">
      <main className="w-full max-w-4xl px-4 py-6">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">{headerTitle}</h1>
        </header>

        <div className="mb-6">
          <div className="flex flex-wrap justify-center gap-5">
            {eventConfig.games.map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGameId(game.id)}
                className={[
                  "px-10 py-1 rounded-full text-sm font-medium border transition",
                  selectedGameId === game.id
                    ? game.isBonus
                      ? "bg-blue-400 text-black border-blue-200 shadow-lg shadow-blue-400/30"
                      : "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/30"
                    : game.isBonus
                    ? "bg-blue-900/60 text-blue-100 border-blue-600 hover:bg-slate-800 transition"
                    : "bg-slate-800 text-slate-100 border-slate-600 hover:bg-slate-700",
                ].join(" ")}
              >
                {game.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          {currentCard && currentPlaylist ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="grid grid-cols-5 gap-[2px] sm:gap-1 md:gap-2">
                {currentCard.entries.map((entry, index) => {
                  const isCenterFree = index === 12;
                  const rawLabel =
                    selectedDisplayMode === "title"
                      ? entry.playlistItem.title
                      : entry.playlistItem.artist;

                  const isSelected = entry.selected;

                  const trimmed = (rawLabel || "").trim();
                  const isLongLabel = trimmed.length > 18;

                  const textSizeClass = isLongLabel
                    ? "text-[0.7rem] sm:text-[0.8rem] md:text-base"
                    : "text-[0.9rem] sm:text-base md:text-lg";

                  const isPatternSquare = patternSet?.has(index) ?? false;

                  const playlistNum = playlistNumber ?? "";
                  const modeUpper = (modeLabel || "").toUpperCase();

                  const tileVariantClass = isCenterFree
                    ? "border-blue-600 bg-blue-700/60 text-blue-100"
                    : isPatternGame
                    ? isSelected
                      ? isPatternSquare
                        ? "bg-emerald-400/90 text-black border-emerald-200 shadow-lg shadow-emerald-500/30"
                        : "bg-red-900/55 text-slate-100 border-red-300/30 shadow"
                      : isPatternSquare
                      ? "bg-emerald-600/45 text-slate-100 border-emerald-400/25"
                      : "bg-white/10 text-slate-100 border-white/20 hover:bg-white/15 hover:border-white/30"
                    : isSelected
                    ? "bg-emerald-400/90 text-black border-emerald-200 shadow-lg shadow-emerald-500/30"
                    : "bg-white/10 text-slate-100 border-white/20 hover:bg-white/15 hover:border-white/30";

                  return (
                    <button
                      key={`${entry.playlistItem.id}-${index}`}
                      onClick={() => handleToggleSquare(index)}
                      disabled={isCenterFree}
                      className={[
                        "w-full h-16 sm:h-20 md:h-24",
                        "flex items-center justify-center rounded-md border px-2 py-1.5",
                        "font-medium text-center leading-tight transition",
                        "backdrop-blur-md",
                        isCenterFree ? "cursor-default" : "",
                        tileVariantClass,
                      ].join(" ")}
                    >
                      {isCenterFree ? (
                        <div className="flex flex-col items-center justify-center leading-none">
                          <div className="text-lg sm:text-2xl md:text-4xl font-semibold tracking-tight">
                            {playlistNum ? playlistNum : "—"}
                          </div>
                          <div className="mt-0 text-[0.65rem] sm:text-xs md:text-sm font-bold tracking-tight">
                            {modeUpper || "MODE"}
                          </div>
                        </div>
                      ) : (
                        <span
                          className={[
                            "block w-full whitespace-normal break-words",
                            textSizeClass,
                          ].join(" ")}
                        >
                          {rawLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={handleResetProgress}
                  className="px-3 py-1 rounded-md text-xs font-semibold bg-red-900 text-red-50 border border-red-800 shadow hover:bg-orange-700 hover:border-orange-500 transition"
                >
                  Reset Progress
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-300 mt-4">No card generated yet for this game.</p>
          )}
        </div>
      </main>
    </div>
  );
}
