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
  playlistId: string; // keep whatever you had
  displayMode?: DisplayMode; // <-- make it optional
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
} from "./realPlaylists";



// --- Demo playlists -------------------------------------------------------

// For now, all playlists share the same fake 75 items.
// Later we will point these to your real music video lists.
const BASE_ITEMS: PlaylistItem[] = Array.from(
  { length: 75 },
  (_, index) => ({
    id: index + 1,
    title: `Song ${index + 1}`,
    artist: `Artist ${index + 1}`,
  })
);

export const PLAYLISTS: Playlist[] = [
  {
    id: "p1",
    name: "Playlist 1 – Title",
    displayMode: "title",
    items: PLAYLIST_1,
  },
  {
    id: "p2",
    name: "Playlist 2 – Artist",
    displayMode: "artist",
    items: PLAYLIST_2,
  },
  {
    id: "p3",
    name: "Playlist 3 – Title",
    displayMode: "title",
    items: PLAYLIST_3,
  },
  {
    id: "p4",
    name: "Playlist 4 – Artist",
    displayMode: "artist",
    items: PLAYLIST_4,
  },
  {
    id: "p5",
    name: "Playlist 5 – Title",
    displayMode: "title",
    items: PLAYLIST_5,
  },
];


// --- Demo events ----------------------------------------------------------

// Eventually, you'll generate these from a host UI & DB.
// For now, we hard-code one event: "demo".
export const EVENTS: EventConfig[] = [
  {
  id: "dec-16-2025",
  name: "Windfall Music Video Bingo",
  games: [
    { id: "game1", name: "Game 1", playlistId: "p1", displayMode: "artist" },
    { id: "game2", name: "Game 2", playlistId: "p2", displayMode: "title" },
    { id: "game3", name: "Game 3", playlistId: "p3", displayMode: "artist" },
    { id: "game4", name: "Game 4", playlistId: "p4", displayMode: "title" },
    { id: "game5", name: "Game 5", playlistId: "p5", displayMode: "artist" },
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
];

// --- Helper functions -----------------------------------------------------

export function getEventConfig(eventId: string): EventConfig | undefined {
  return EVENTS.find((e) => e.id === eventId);
}

export function getPlaylistById(playlistId: string): Playlist | undefined {
  return PLAYLISTS.find((p) => p.id === playlistId);
}
