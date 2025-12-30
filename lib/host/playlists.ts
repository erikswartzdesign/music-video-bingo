// lib/host/playlists.ts

export type PlaylistOption = { id: string; label: string };

/**
 * Change this number later (e.g. 30) and the UI automatically expands.
 * For now you said you ultimately want 20.
 */
export const MAX_PLAYLISTS = 20;

export const PLAYLIST_OPTIONS: PlaylistOption[] = Array.from(
  { length: MAX_PLAYLISTS },
  (_, idx) => {
    const n = idx + 1;
    return { id: `p${n}`, label: `Playlist ${n}` };
  }
);

/**
 * Optional helper (nice for validation + future API guards)
 */
export function isValidPlaylistKey(key: string) {
  const m = String(key || "").trim().match(/^p(\d+)$/);
  if (!m) return false;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PLAYLISTS;
}

