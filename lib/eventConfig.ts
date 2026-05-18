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
  {
    id: "p16T",
    name: "Playlist 16 – Title",
    displayMode: "title",
    items: PLAYLIST_16,
  },
  {
    id: "p16A",
    name: "Playlist 16 – Artist",
    displayMode: "artist",
    items: PLAYLIST_16,
  },
];

// --- Events ---------------------------------------------------------------
// Events are now managed through Supabase via the host dashboard.

export const EVENTS: EventConfig[] = [];

// --- Helper functions -----------------------------------------------------

export function getEventConfig(eventId: string): EventConfig | undefined {
  return EVENTS.find((e) => e.id === eventId);
}

export function getPlaylistById(playlistId: string): Playlist | undefined {
  return PLAYLISTS.find((p) => p.id === playlistId);
}
