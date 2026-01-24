// lib/eventConfigDb.ts
import { createClient } from "@supabase/supabase-js";

export type DbDisplayMode = "title" | "artist";

export type DbGameConfig = {
  gameNumber: 1 | 2 | 3 | 4 | 5 | 6;
  playlistKey: string; // e.g. "p6"
  displayMode: DbDisplayMode; // "title" | "artist"
  patternId: number | null; // 1..25 or null
};

export type DbEventConfig = {
  eventCode: string;
  eventName: string; // <-- NEW (from events.name)
  venueSlug: string;
  venueName: string;
  games: DbGameConfig[];
};

// Uses NEXT_PUBLIC anon client (safe for SELECT with your read policies)
function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }

  return createClient(url, anon, {
    auth: { persistSession: false },
  });
}

type VenueRel = { slug: any; name: any };

function normalizeVenueRel(input: any): VenueRel | null {
  if (!input) return null;
  if (Array.isArray(input)) return (input[0] as VenueRel) ?? null;
  return input as VenueRel;
}

/**
 * Load DB-driven config for an event by event_code.
 * Returns null if:
 * - event_code not found, OR
 * - event found but has no event_games rows yet
 */
export async function getEventConfigFromDb(
  eventCode: string,
): Promise<DbEventConfig | null> {
  const supabase = getPublicSupabase();

  // 1) Fetch event + venue
  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select(
      `
      id,
      event_code,
      name,
      venue_id,
      venues:venue_id (
        slug,
        name
      )
    `,
    )
    .eq("event_code", eventCode)
    .maybeSingle();

  if (eventErr) throw eventErr;
  if (!eventRow?.id) return null;

  const venue = normalizeVenueRel((eventRow as any).venues);
  if (!venue) return null;

  // 2) Fetch event_games (now includes 1–6)
  const { data: gameRows, error: gamesErr } = await supabase
    .from("event_games")
    .select("game_number, playlist_key, display_mode, pattern_id")
    .eq("event_id", eventRow.id)
    .order("game_number", { ascending: true });

  if (gamesErr) throw gamesErr;
  if (!gameRows || gameRows.length === 0) return null;

  const games: DbGameConfig[] = gameRows
    .filter((g: any) => {
      const n = Number(g.game_number);
      return n >= 1 && n <= 6;
    })
    .map((g: any) => ({
      gameNumber: Number(g.game_number) as 1 | 2 | 3 | 4 | 5 | 6,
      playlistKey: String(g.playlist_key),
      displayMode: ((g.display_mode as DbDisplayMode) ??
        "title") as DbDisplayMode,
      patternId: g.pattern_id ?? null,
    }));

  const eventName =
    String((eventRow as any).name ?? "").trim() ||
    `${String(venue.name ?? venue.slug)} — ${String(eventRow.event_code)}`;

  return {
    eventCode: String(eventRow.event_code),
    eventName,
    venueSlug: String(venue.slug),
    venueName: String(venue.name ?? venue.slug),
    games,
  };
}
