"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  DisplayMode,
  PlaylistItem,
  GameConfig,
  getEventConfig,
  getPlaylistById,
} from "../../../lib/eventConfig";


type CardEntry = {
  playlistItem: PlaylistItem;
};

type CardState = {
  entries: CardEntry[];
  marked: boolean[]; // 25 booleans for the 5x5 grid
};

type GameWithPlaylist = {
  game: GameConfig;
  playlistId: string;
  playlistName: string;
  displayMode: DisplayMode;
  items: PlaylistItem[];
};

/**
 * Generate a random card from a specific playlist's items.
 */
function generateRandomCard(items: PlaylistItem[]): CardState {
  const pool = [...items];

  // Fisher–Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const selected = pool.slice(0, 24);
  const entries = selected.map((playlistItem) => ({ playlistItem }));

  const marked = Array(25).fill(false) as boolean[];
  marked[12] = true; // center FREE is marked

  return { entries, marked };
}

export default function EventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const eventConfig = getEventConfig(eventId);

  // If we don't know this event, show a simple message
  if (!eventConfig) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-2">
          Music Video Bingo – Unknown Event
        </h1>
        <p className="mb-4 text-center">
          There is no event configured with the ID &quot;{eventId}&quot;.
          Please check the link or ask your host for the correct QR code.
        </p>
      </main>
    );
  }

  // Build a richer game list that includes playlist info
  const gamesWithPlaylist: GameWithPlaylist[] = eventConfig.games
    .map((game) => {
      const playlist = getPlaylistById(game.playlistId);
      if (!playlist) return null;

      return {
        game,
        playlistId: playlist.id,
        playlistName: playlist.name,
        displayMode: playlist.displayMode,
        items: playlist.items,
      };
    })
    .filter((g): g is GameWithPlaylist => g !== null);

  // Which game is currently selected in the UI
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Per-game card state (so each game has its own card and marks)
  const [cardsByGame, setCardsByGame] = useState<Record<string, CardState>>({});

  const handleSelectGame = (gameId: string) => {
    setSelectedGameId(gameId);

    const game = gamesWithPlaylist.find((g) => g.game.id === gameId);
    if (!game) return;

    setCardsByGame((prev) => {
      // If we already generated a card for this game, keep it
      if (prev[gameId]) {
        return prev;
      }
      // Otherwise, generate a brand new card for this game from its playlist
      return {
        ...prev,
        [gameId]: generateRandomCard(game.items),
      };
    });
  };

  // Clear marks ONLY (no new card), keeping the same layout
  const handleClearMarksForSelectedGame = () => {
    if (!selectedGameId) return;

    setCardsByGame((prev) => {
      const currentCard = prev[selectedGameId];
      if (!currentCard) return prev;

      const newMarked = Array(25).fill(false) as boolean[];
      newMarked[12] = true; // keep FREE marked

      return {
        ...prev,
        [selectedGameId]: {
          ...currentCard,
          marked: newMarked,
        },
      };
    });
  };

  const handleToggleSquare = (gridIndex: number) => {
    if (!selectedGameId) return;

    setCardsByGame((prev) => {
      const currentCard = prev[selectedGameId];
      if (!currentCard) return prev;

      // Don't allow toggling the FREE square for now
      if (gridIndex === 12) {
        return prev;
      }

      const newMarked = [...currentCard.marked];
      newMarked[gridIndex] = !newMarked[gridIndex];

      return {
        ...prev,
        [selectedGameId]: {
          ...currentCard,
          marked: newMarked,
        },
      };
    });
  };

  const selectedGame = gamesWithPlaylist.find(
    (g) => g.game.id === selectedGameId
  );

  const renderCard = () => {
    if (!selectedGameId) {
      return (
        <p className="mt-6 text-center">
          Select a game above to generate your card.
        </p>
      );
    }

    const card = cardsByGame[selectedGameId];

    if (!card) {
      return (
        <p className="mt-6 text-center">
          Generating card for this game... (click the game button again if
          needed)
        </p>
      );
    }

    const { entries, marked } = card;
    const gridIndices = Array.from({ length: 25 }, (_, i) => i);

    return (
      <div className="mt-6 grid grid-cols-5 gap-1 max-w-md mx-auto">
        {gridIndices.map((gridIndex) => {
          // Center FREE square
          if (gridIndex === 12) {
            const isMarked = marked[gridIndex];
            return (
              <button
                key={gridIndex}
                type="button"
                className={`aspect-square border text-xs flex items-center justify-center font-bold text-gray-900 ${
                  isMarked ? "bg-green-300" : "bg-white"
                }`}
                onClick={() => handleToggleSquare(gridIndex)}
              >
                FREE
              </button>
            );
          }

          // Map grid index to our 24 card entries (skip the center)
          const dataIndex = gridIndex > 12 ? gridIndex - 1 : gridIndex;
          const entry = entries[dataIndex];
          const isMarked = marked[gridIndex];

          const displayText =
            selectedGame?.displayMode === "artist"
              ? entry.playlistItem.artist
              : entry.playlistItem.title;

          return (
            <button
              key={gridIndex}
              type="button"
              className={`aspect-square border p-1 text-xs flex items-center justify-center text-center break-words font-semibold ${
                isMarked
                  ? "bg-green-300 text-gray-900"
                  : "bg-white text-gray-900"
              }`}
              onClick={() => handleToggleSquare(gridIndex)}
            >
              {displayText}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-4">
      <h1 className="text-2xl font-bold mt-4">
        Music Video Bingo – Event: {eventConfig.name} ({eventConfig.id})
      </h1>
      <p className="mt-2 text-center max-w-xl">
        This URL represents tonight&apos;s show. Select one of tonight&apos;s
        games below to generate a bingo card for that game. Each game keeps its
        own card and marks (for this device).
      </p>

      {/* Game selection buttons */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {gamesWithPlaylist.map(({ game, playlistName }) => (
          <button
            key={game.id}
            type="button"
            className={`px-3 py-2 rounded text-sm font-semibold border ${
              selectedGameId === game.id
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white text-blue-700 border-blue-400"
            }`}
            onClick={() => handleSelectGame(game.id)}
          >
            {game.name}
          </button>
        ))}
      </div>

      {/* Info about the selected game */}
      {selectedGame && (
        <div className="mt-4 text-center">
          <p className="font-medium">
            Selected: {selectedGame.game.name} ({selectedGame.playlistName}) –{" "}
            {selectedGame.displayMode === "artist"
              ? "Mark the artist names"
              : "Mark the song titles"}
          </p>
          <button
            type="button"
            className="mt-2 px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            onClick={handleClearMarksForSelectedGame}
          >
            Clear Marks on this Card
          </button>
        </div>
      )}

      {renderCard()}
    </main>
  );
}
