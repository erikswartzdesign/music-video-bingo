"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
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
  eventId: string;
  selectedGameId: string | null;
  cardsByGameId: Record<string, BingoCard>;
  savedAt: number;
};

// =============================
// Pattern support (Games 2–5)
// Squares are specified 1–25 (left-to-right, top-to-bottom).
// We convert to 0–24 indexes internally.
// FREE (center) is 13 (index 12) and is never included in pattern lists.
// =============================
const GAME_PATTERNS_1_TO_25: Record<string, number[]> = {
  game2: [1, 5, 21, 25],
  game3: [8, 12, 14, 18],
  game4: [2, 4, 8, 18, 22, 24],
  game5: [6, 10, 12, 14, 16, 20],
};

function getPatternSetForGame(gameId: string | undefined) {
  if (!gameId) return null;
  const nums = GAME_PATTERNS_1_TO_25[gameId];
  if (!nums) return null;

  const set = new Set<number>();
  for (const n of nums) set.add(n - 1); // 1–25 -> 0–24
  return set;
}

function generateCardForPlaylist(playlist: PlaylistItem[]): BingoCard {
  const available = [...playlist];

  // Fisher–Yates shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  // We need 24 unique entries (center is FREE)
  const chosen = available.slice(0, 24);

  const entries: CardEntry[] = [];
  let chosenIndex = 0;

  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      entries.push({
        playlistItem: {
          id: -1,
          title: "FREE",
          artist: "",
        },
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

function storageKeyForEvent(eventId: string) {
  return `mvb:playerState:v1:event:${eventId}`;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Ensure the FREE center is always present and selected.
function normalizeCard(card: BingoCard): BingoCard {
  if (!card || !Array.isArray(card.entries) || card.entries.length !== 25) return card;

  const entries = card.entries.map((e, idx) => {
    if (idx === 12) {
      return {
        playlistItem: { id: -1, title: "FREE", artist: "" },
        selected: true,
      };
    }
    // Defensive: if something is missing, patch minimal structure
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

function normalizeCardsByGameId(
  cardsByGameId: Record<string, BingoCard>
): Record<string, BingoCard> {
  const next: Record<string, BingoCard> = {};
  for (const [gameId, card] of Object.entries(cardsByGameId || {})) {
    if (!card || !Array.isArray(card.entries) || card.entries.length !== 25) continue;
    next[gameId] = normalizeCard(card);
  }
  return next;
}

export default function EventPage() {
  const params = useParams<{ eventId?: string }>();
  const eventId = params?.eventId ?? "demo";
  const isTonightPlayerEvent = eventId === "dec-16-2025";

  const eventConfig = useMemo(() => getEventConfig(eventId), [eventId]);

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Start with no cards; fill them in on the client after mount
  const [cardsByGameId, setCardsByGameId] = useState<Record<string, BingoCard>>(
    {}
  );

  // --- Persistence control flags ---
  const hasRestoredRef = useRef(false);
  const lastSavedStringRef = useRef<string>("");

  // 1) Restore from localStorage on eventId change (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    hasRestoredRef.current = false;
    lastSavedStringRef.current = "";

    const key = storageKeyForEvent(eventId);
    const raw = window.localStorage.getItem(key);
    const parsed = safeJsonParse<PersistedStateV1>(raw);

    if (
      parsed &&
      parsed.v === 1 &&
      parsed.eventId === eventId &&
      parsed.cardsByGameId &&
      typeof parsed.cardsByGameId === "object"
    ) {
      const normalizedCards = normalizeCardsByGameId(parsed.cardsByGameId);

      setCardsByGameId(normalizedCards);
      setSelectedGameId(parsed.selectedGameId ?? null);

      hasRestoredRef.current = true;
    } else {
      // No saved state for this event
      setCardsByGameId({});
      setSelectedGameId(null);
      hasRestoredRef.current = true;
    }
  }, [eventId]);

  // 2) Ensure selectedGameId is set once we have eventConfig
  useEffect(() => {
    if (!eventConfig) return;

    setSelectedGameId((prev) => {
      // Keep existing selection if it's a valid game
      if (prev && eventConfig.games.some((g) => g.id === prev)) return prev;

      // Otherwise default to first game
      return eventConfig.games[0]?.id ?? null;
    });
  }, [eventConfig]);

  // 3) Generate missing cards (client-only), but DO NOT overwrite restored ones
  useEffect(() => {
    if (!eventConfig) return;
    if (!hasRestoredRef.current) return;

    setCardsByGameId((prev) => {
      const next: Record<string, BingoCard> = { ...prev };

      for (const game of eventConfig.games) {
        if (!next[game.id]) {
          const playlist = getPlaylistById(game.playlistId);
          if (playlist) {
            next[game.id] = generateCardForPlaylist(playlist.items);
          }
        } else {
          // Normalize existing card to enforce FREE square
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

    // Build persisted payload
    const payload: PersistedStateV1 = {
      v: 1,
      eventId,
      selectedGameId,
      cardsByGameId: normalizeCardsByGameId(cardsByGameId),
      savedAt: Date.now(),
    };

    const key = storageKeyForEvent(eventId);
    const json = JSON.stringify(payload);

    // Avoid repeated identical writes
    if (json === lastSavedStringRef.current) return;
    lastSavedStringRef.current = json;

    try {
      window.localStorage.setItem(key, json);
    } catch {
      // If storage is full/blocked, fail silently
    }
  }, [eventId, eventConfig, selectedGameId, cardsByGameId]);

  // Orientation detection for the rotate overlay
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

  if (!eventConfig) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <p className="text-sm text-gray-300">
            There is no event configuration for ID:{" "}
            <span className="font-mono">{eventId}</span>
          </p>
        </div>
      </div>
    );
  }

  const currentGame: GameConfig | undefined = eventConfig.games.find(
    (g) => g.id === selectedGameId
  );

  const currentPlaylist = currentGame
    ? getPlaylistById(currentGame.playlistId)
    : null;

  const currentCard = currentGame ? cardsByGameId[currentGame.id] : null;

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

    // Do not toggle the FREE center
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

  const selectedDisplayMode: DisplayMode = currentGame?.displayMode ?? "title";
  const playlistNumber = currentGame?.playlistId?.match(/\d+/)?.[0] ?? null;

  const playlistLabel = playlistNumber
    ? `Playlist ${playlistNumber}`
    : currentGame?.playlistId
    ? `Playlist (${currentGame.playlistId})`
    : "Playlist";

  const modeLabel = selectedDisplayMode === "title" ? "Title" : "Artist";

  // Pattern logic for current game
  const currentGameId = currentGame?.id;
  const patternSet = getPatternSetForGame(currentGameId);
  const isPatternGame =
    currentGameId !== undefined &&
    currentGameId !== "game1" &&
    patternSet !== null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex flex-col items-center relative">
      {/* Portrait overlay */}
      {!isLandscape && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-slate-100 px-6 text-center">
          <div className="mb-4 text-4xl">🔄</div>
          <h2 className="text-xl font-semibold mb-2">Rotate Your Phone</h2>
          <p className="text-sm text-slate-300 max-w-xs">
            For the best Music Video Bingo experience, please rotate your device
            to landscape.
          </p>
        </div>
      )}

      <main className="w-full max-w-4xl px-4 py-6">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">{eventConfig.name}</h1>
          <p className="text-sm text-slate-300">
            Event ID:{" "}
            <span className="font-mono text-slate-200">{eventConfig.id}</span>
          </p>
        </header>

        {/* Game selector buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {eventConfig.games.map((game) => (
            <button
              key={game.id}
              onClick={() => setSelectedGameId(game.id)}
              className={[
                "px-3 py-1 rounded-full text-sm font-medium border transition",
                selectedGameId === game.id
                  ? "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/30"
                  : "bg-slate-800 text-slate-100 border-slate-600 hover:bg-slate-700",
              ].join(" ")}
            >
              {game.name}
            </button>
          ))}
        </div>

        {/* Card + controls */}
        <div className="flex flex-col items-center gap-4">

          {currentCard && currentPlaylist ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="mb-2 text-center text-base sm:text-lg md:text-xl text-slate-200">
                <span className="font-semibold">{playlistLabel}</span>
                <span className="text-slate-400"> • </span>
                <span className="font-semibold">{modeLabel}</span>
              </div>

              <div className="mb-3 flex justify-center">
    <button
      type="button"
      onClick={handleResetProgress}
      className="px-2.5 py-1 rounded text-xs font-semibold bg-orange-800 text-orange-50 border border-orange-600 shadow hover:bg-orange-700 hover:border-orange-500 transition"
    >
      Reset Progress
    </button>
  </div>

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

                  const tileVariantClass = isCenterFree
                    ? "bg-yellow-400/70 text-black border-yellow-200/70 shadow"
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
                        <span className="font-semibold tracking-wide">FREE</span>
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
            </div>
          ) : (
            <p className="text-sm text-slate-300 mt-4">
              No card generated yet for this game.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
