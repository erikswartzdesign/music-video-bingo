"use client";

import { useState, useMemo, useEffect } from "react";
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

export default function EventPage() {
  const params = useParams<{ eventId?: string }>();
  const eventId = params?.eventId ?? "demo";

  const eventConfig = useMemo(() => getEventConfig(eventId), [eventId]);

  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    eventConfig?.games[0]?.id ?? null
  );

  // Start with no cards; fill them in on the client after mount
  const [cardsByGameId, setCardsByGameId] = useState<Record<string, BingoCard>>(
    {}
  );

  // Generate initial cards on the client ONLY to avoid hydration mismatch
  useEffect(() => {
    if (!eventConfig) return;

    setCardsByGameId((prev) => {
      const next: Record<string, BingoCard> = { ...prev };

      for (const game of eventConfig.games) {
        if (!next[game.id]) {
          const playlist = getPlaylistById(game.playlistId);
          if (playlist) {
            next[game.id] = generateCardForPlaylist(playlist.items);
          }
        }
      }

      return next;
    });
  }, [eventConfig]);

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

  const handleGenerateNewCard = () => {
    if (!currentGame || !currentPlaylist) return;

    const newCard = generateCardForPlaylist(currentPlaylist.items);

    setCardsByGameId((prev) => ({
      ...prev,
      [currentGame.id]: newCard,
    }));
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

  const selectedDisplayMode: DisplayMode =
    currentGame?.displayMode ?? "title";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex flex-col items-center relative">
      {/* Portrait overlay */}
      {!isLandscape && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-slate-100 px-6 text-center">
          <div className="mb-4 text-4xl">🔄</div>
          <h2 className="text-xl font-semibold mb-2">Rotate Your Phone</h2>
          <p className="text-sm text-slate-300 max-w-xs">
            For the best Music Video Bingo experience, please rotate your
            device to landscape.
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

        {/* Info & actions */}
        <div className="mb-4 text-center space-y-1">
          {currentGame && currentPlaylist ? (
            <>
              <p className="text-sm text-slate-200">
                Selected Game:{" "}
                <span className="font-semibold">{currentGame.name}</span>
              </p>
              <p className="text-xs text-slate-300">
                Playlist:{" "}
                <span className="font-mono text-slate-200">
                  {currentPlaylist.name}
                </span>{" "}
                • Mode:{" "}
                <span className="font-semibold">
                  {currentGame.displayMode === "title"
                    ? "Titles"
                    : "Artists"}
                </span>{" "}
                • Items:{" "}
                <span className="font-mono">{currentPlaylist.items.length}</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-300">
              Select a game above to view a card.
            </p>
          )}
        </div>

        {/* Card + controls */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleGenerateNewCard}
            disabled={!currentGame || !currentPlaylist}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-emerald-500 text-black disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed shadow-md hover:bg-emerald-400 transition"
          >
            Generate New Card
          </button>

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

                  // Bigger fonts across the board, still a bit smaller for long labels
                  const textSizeClass = isLongLabel
                    ? "text-[0.7rem] sm:text-[0.8rem] md:text-base"
                    : "text-[0.9rem] sm:text-base md:text-lg";

                  return (
                    <button
  key={`${entry.playlistItem.id}-${index}`}
  onClick={() => handleToggleSquare(index)}
  className={[
    "w-full h-16 sm:h-20 md:h-24",
    "flex items-center justify-center rounded-md border px-2 py-1.5",
    "font-medium text-center leading-tight transition",
    "backdrop-blur-md",
    isCenterFree
      ? "bg-emerald-400/90 text-black border-emerald-200 shadow-lg"
      : isSelected
      ? "bg-emerald-300/80 text-black border-emerald-100 shadow-lg shadow-emerald-500/40"
      : "bg-white/10 text-slate-100 border-white/20 hover:bg-white/15 hover:border-white/30",
  ].join(" ")}
>

                      {isCenterFree ? (
                        <span className="font-semibold tracking-wide">
                          FREE
                        </span>
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
