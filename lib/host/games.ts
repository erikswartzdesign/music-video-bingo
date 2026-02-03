// lib/host/games.ts
import type { HostGameForm } from "@/lib/host/types";

export function defaultGames(): HostGameForm[] {
  return [
    { gameNumber: 1, playlistKey: "", displayMode: "", patternId: null },
    { gameNumber: 2, playlistKey: "", displayMode: "", patternId: null },
    { gameNumber: 3, playlistKey: "", displayMode: "", patternId: null },
    { gameNumber: 4, playlistKey: "", displayMode: "", patternId: null },
    { gameNumber: 5, playlistKey: "", displayMode: "", patternId: null },
  ];
}
