// lib/host/games.ts
import type { HostGameForm } from "@/lib/host/types";

export function defaultGames(): HostGameForm[] {
  return [
    { gameNumber: 1, playlistKey: "p6", displayMode: "title", patternId: null },
    { gameNumber: 2, playlistKey: "p7", displayMode: "artist", patternId: 1 },
    { gameNumber: 3, playlistKey: "p8", displayMode: "title", patternId: 2 },
    { gameNumber: 4, playlistKey: "p9", displayMode: "artist", patternId: 3 },
    { gameNumber: 5, playlistKey: "p10", displayMode: "title", patternId: 4 },
  ];
}
