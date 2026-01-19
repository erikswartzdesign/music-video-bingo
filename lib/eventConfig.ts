export type DisplayMode = "title" | "artist";

export type PlaylistItem = {
  id: number;
  title: string;
  artist: string;
};

export type Playlist = {
  id: string;
  name: string;
  displayMode: DisplayMode; // whether bingo looks for title or artist
  items: PlaylistItem[];
};

export type GameConfig = {
  id: string;
  name: string;
  playlistId: string;
  displayMode?: DisplayMode; // optional override per game
  /**
   * Optional hardcoded pattern for this game (local-only mode).
   * Uses 1–25 numbering left-to-right, top-to-bottom (like a printed bingo card).
   * Center FREE is 13 (index 12). You may include 13, but it will be ignored.
   */
  patternCells?: number[];
};

export type EventConfig = {
  id: string;
  name: string;
  games: GameConfig[];
};

import {
  PLAYLIST_1,
  PLAYLIST_2,
  PLAYLIST_3,
  PLAYLIST_4,
  PLAYLIST_5,
  PLAYLIST_6,
  PLAYLIST_7,
  PLAYLIST_8,
  PLAYLIST_9,
  PLAYLIST_10,
  PLAYLIST_11,
  PLAYLIST_12,
  PLAYLIST_13,
  PLAYLIST_14,
  PLAYLIST_15,
  // keeping these in case you still have them
  PLAYLIST_16,
  PLAYLIST_17,
} from "./realPlaylists";

// --- Demo playlists -------------------------------------------------------

export const PLAYLISTS: Playlist[] = [
  {
    id: "p1T",
    name: "Playlist 1 – Title",
    displayMode: "title",
    items: PLAYLIST_1,
  },
  {
    id: "p1A",
    name: "Playlist 1 – Artist",
    displayMode: "artist",
    items: PLAYLIST_1,
  },
  {
    id: "p2T",
    name: "Playlist 2 – Title",
    displayMode: "title",
    items: PLAYLIST_2,
  },
  {
    id: "p2A",
    name: "Playlist 2 – Artist",
    displayMode: "artist",
    items: PLAYLIST_2,
  },
  {
    id: "p3T",
    name: "Playlist 3 – Title",
    displayMode: "title",
    items: PLAYLIST_3,
  },
  {
    id: "p3A",
    name: "Playlist 3 – Artist",
    displayMode: "artist",
    items: PLAYLIST_3,
  },
  {
    id: "p4T",
    name: "Playlist 4 – Title",
    displayMode: "title",
    items: PLAYLIST_4,
  },
  {
    id: "p4A",
    name: "Playlist 4 – Artist",
    displayMode: "artist",
    items: PLAYLIST_4,
  },
  {
    id: "p5T",
    name: "Playlist 5 – Title",
    displayMode: "title",
    items: PLAYLIST_5,
  },
  {
    id: "p5A",
    name: "Playlist 5 – Artist",
    displayMode: "artist",
    items: PLAYLIST_5,
  },
  {
    id: "p6T",
    name: "Playlist 6 – Title",
    displayMode: "title",
    items: PLAYLIST_6,
  },
  {
    id: "p6A",
    name: "Playlist 6 – Artist",
    displayMode: "artist",
    items: PLAYLIST_6,
  },
  {
    id: "p7T",
    name: "Playlist 7 – Title",
    displayMode: "title",
    items: PLAYLIST_7,
  },
  {
    id: "p7A",
    name: "Playlist 7 – Artist",
    displayMode: "artist",
    items: PLAYLIST_7,
  },
  {
    id: "p8T",
    name: "Playlist 8 – Title",
    displayMode: "title",
    items: PLAYLIST_8,
  },
  {
    id: "p8A",
    name: "Playlist 8 – Artist",
    displayMode: "artist",
    items: PLAYLIST_8,
  },
  {
    id: "p9T",
    name: "Playlist 9 – Title",
    displayMode: "title",
    items: PLAYLIST_9,
  },
  {
    id: "p9A",
    name: "Playlist 9 – Artist",
    displayMode: "artist",
    items: PLAYLIST_9,
  },
  {
    id: "p10T",
    name: "Playlist 10 – Title",
    displayMode: "title",
    items: PLAYLIST_10,
  },
  {
    id: "p10A",
    name: "Playlist 10 – Artist",
    displayMode: "artist",
    items: PLAYLIST_10,
  },
  {
    id: "p11T",
    name: "Playlist 11 – Title",
    displayMode: "title",
    items: PLAYLIST_11,
  },
  {
    id: "p11A",
    name: "Playlist 11 – Artist",
    displayMode: "artist",
    items: PLAYLIST_11,
  },
  {
    id: "p12T",
    name: "Playlist 12 – Title",
    displayMode: "title",
    items: PLAYLIST_12,
  },
  {
    id: "p12A",
    name: "Playlist 12 – Artist",
    displayMode: "artist",
    items: PLAYLIST_12,
  },
  {
    id: "p13T",
    name: "Playlist 13 – Title",
    displayMode: "title",
    items: PLAYLIST_13,
  },
  {
    id: "p13A",
    name: "Playlist 13 – Artist",
    displayMode: "artist",
    items: PLAYLIST_13,
  },
  {
    id: "p14T",
    name: "Playlist 14 – Title",
    displayMode: "title",
    items: PLAYLIST_14,
  },
  {
    id: "p14A",
    name: "Playlist 14 – Artist",
    displayMode: "artist",
    items: PLAYLIST_14,
  },
  {
    id: "p15T",
    name: "Playlist 15 – Title",
    displayMode: "title",
    items: PLAYLIST_15,
  },
  {
    id: "p15A",
    name: "Playlist 15 – Artist",
    displayMode: "artist",
    items: PLAYLIST_15,
  },
];

// --- Demo events ----------------------------------------------------------

// Eventually, you'll generate these from a host UI & DB.
// For now, we hard-code events.
export const EVENTS: EventConfig[] = [
  // TONIGHT (hard-coded)
  {
    id: "WF-brewing",
    name: "Music Video Bingo — Jan 20, 2026",
    games: [
      // Game 1 typically no pattern
      { id: "game1", name: "Game 1", playlistId: "p6A", displayMode: "artist" },

      // Games 2–5 with patterns (edit if you want different ones)
      { id: "game2", name: "Game 2", playlistId: "p7T", displayMode: "title", patternCells: [6, 10, 16, 20] },
      { id: "game3", name: "Game 3", playlistId: "p8A", displayMode: "artist",  patternCells: [2, 4, 22, 24] },
      { id: "game4", name: "Game 4", playlistId: "p9T", displayMode: "title", patternCells: [3, 5, 9, 17, 21, 23] },
      { id: "game5", name: "Game 5", playlistId: "p10A", displayMode: "artist",  patternCells: [1, 3, 7, 19, 23, 25] },
    ],
  },

  // Existing
  {
    id: "dec-30-2025",
    name: "Windfall Music Video Bingo",
    games: [
      { id: "game1", name: "Game 1", playlistId: "p1", displayMode: "artist" },
      { id: "game2", name: "Game 2", playlistId: "p6", displayMode: "title",  patternCells: [7, 9, 17, 19] },
      { id: "game3", name: "Game 3", playlistId: "p3", displayMode: "artist", patternCells: [3, 11, 15, 23] },
      { id: "game4", name: "Game 4", playlistId: "p4", displayMode: "title",  patternCells: [5, 9, 11, 15, 17, 21] },
      { id: "game5", name: "Game 5", playlistId: "p5", displayMode: "artist", patternCells: [2, 6, 8, 18, 20, 24] },
    ],
  },
  {
    id: "second-demo",
    name: "Second Demo Night at Pub Y",
    games: [
      { id: "game1", name: "Early Game – Titles", playlistId: "p3" },
      { id: "game2", name: "Main Game – Artists", playlistId: "p2" },
      { id: "game3", name: "Throwback – Titles", playlistId: "p1" },
      { id: "game4", name: "Wildcard – Artists", playlistId: "p4" },
      { id: "game5", name: "Late Game – Titles", playlistId: "p5" },
    ],
  },
  {
    id: "dec-22-2025",
    name: "Music Video Bingo – Dec 22, 2025",
    games: [
      { id: "game1", name: "Game 1", playlistId: "p6", displayMode: "title" },
      { id: "game2", name: "Game 2", playlistId: "p7", displayMode: "artist" },
      { id: "game3", name: "Game 3", playlistId: "p8", displayMode: "title" },
      { id: "game4", name: "Game 4", playlistId: "p9", displayMode: "artist" },
      { id: "game5", name: "Game 5", playlistId: "p10", displayMode: "title" },
    ],
  },
];

// --- Helper functions -----------------------------------------------------

export function getEventConfig(eventId: string): EventConfig | undefined {
  return EVENTS.find((e) => e.id === eventId);
}

export function getPlaylistById(playlistId: string): Playlist | undefined {
  return PLAYLISTS.find((p) => p.id === playlistId);
}
