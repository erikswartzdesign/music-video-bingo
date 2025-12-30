// lib/host/types.ts
import type { DisplayMode } from "@/lib/eventConfig";

export type VenueRow = {
  id: string;
  slug: string;
  name: string | null;
};

export type EventRow = {
  id: string;
  event_code: string;
  name: string | null;
  start_at: string | null;
  status: string;
  config_key: string | null;
};

export type DbPatternRow = {
  id: number;
  name: string;
};

export type HostGameForm = {
  gameNumber: 1 | 2 | 3 | 4 | 5;
  playlistKey: string; // e.g. "p6"
  displayMode: DisplayMode; // "title" | "artist"
  patternId: number | null; // null or 1..N
};

export type DbEventGameRow = {
  event_id: string;
  game_number: number;
  playlist_key: string;
  display_mode: "title" | "artist" | null;
  pattern_id: number | null;
};

export type PlaylistOption = { id: string; label: string };
