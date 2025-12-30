// app/api/host/events/games/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PatchBody = {
  venueSlug?: string;
  // Optional: if provided, we’ll update this specific event (must belong to venue)
  // If omitted, we update the currently ACTIVE event for that venue.
  eventCode?: string;
  games?: {
    gameNumber: number; // 1..6 (6 = Bonus)
    playlistKey: string; // "p1".."p20"
    displayMode?: "title" | "artist";
    patternId?: number | null; // null = no pattern
  }[];
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// Future-proof: you said 20 playlists eventually, so validate up to 20 now.
const MAX_PLAYLIST_NUMBER = 20;

function parsePlaylistKey(playlistKey: string) {
  const key = String(playlistKey ?? "").trim().toLowerCase();
  const m = /^p(\d+)$/.exec(key);
  if (!m)
    return {
      ok: false as const,
      error: `Invalid playlistKey "${playlistKey}". Use p1–p${MAX_PLAYLIST_NUMBER}.`,
    };

  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PLAYLIST_NUMBER) {
    return {
      ok: false as const,
      error: `Invalid playlistKey "${playlistKey}". Use p1–p${MAX_PLAYLIST_NUMBER}.`,
    };
  }

  return { ok: true as const, normalized: `p${n}` };
}

function normalizeGames(input: PatchBody["games"]) {
  if (!input || !Array.isArray(input)) {
    return { ok: false as const, error: "Missing games array." };
  }

  const out: {
    game_number: number;
    playlist_key: string;
    display_mode: "title" | "artist";
    pattern_id: number | null;
  }[] = [];

  for (const g of input) {
    const gameNumber = Number(g.gameNumber);
    if (!Number.isInteger(gameNumber) || gameNumber < 1 || gameNumber > 6) {
      return { ok: false as const, error: `Invalid gameNumber: ${g.gameNumber}` };
    }

    const playlistKeyRaw = String(g.playlistKey ?? "").trim();
    if (!playlistKeyRaw) {
      return { ok: false as const, error: `Missing playlistKey for game ${gameNumber}` };
    }

    const parsed = parsePlaylistKey(playlistKeyRaw);
    if (!parsed.ok) {
      return { ok: false as const, error: `Game ${gameNumber}: ${parsed.error}` };
    }

    const displayMode = (g.displayMode ?? "title") as "title" | "artist";
    if (displayMode !== "title" && displayMode !== "artist") {
      return { ok: false as const, error: `Invalid displayMode for game ${gameNumber}` };
    }

    const patternIdRaw = g.patternId ?? null;
    const patternId =
      patternIdRaw === null || patternIdRaw === undefined ? null : Number(patternIdRaw);

    if (patternId !== null) {
      if (!Number.isInteger(patternId) || patternId < 1 || patternId > 25) {
        return { ok: false as const, error: `Invalid patternId for game ${gameNumber}` };
      }
    }

    // Enforce: Game 1 never has a pattern
    out.push({
      game_number: gameNumber,
      playlist_key: parsed.normalized,
      display_mode: displayMode,
      pattern_id: gameNumber === 1 ? null : patternId,
    });
  }

  // Must include all 5 main games
  const nums = new Set(out.map((r) => r.game_number));
  for (let i = 1; i <= 5; i++) {
    if (!nums.has(i)) return { ok: false as const, error: "games must include gameNumber 1–5." };
  }

  // Bonus (6) optional
  out.sort((a, b) => a.game_number - b.game_number);

  return { ok: true as const, rows: out };
}

async function assertPatternsExist(
  supabase: ReturnType<typeof createAdminClient>,
  patternIds: number[]
) {
  if (!patternIds.length) return { ok: true as const };

  const unique = Array.from(new Set(patternIds)).sort((a, b) => a - b);

  const { data, error } = await supabase.from("patterns").select("id").in("id", unique);

  if (error) return { ok: false as const, error: `Pattern lookup failed: ${error.message}` };

  const found = new Set<number>((data ?? []).map((r: any) => Number(r.id)));
  const missing = unique.filter((id) => !found.has(id));

  if (missing.length) {
    return { ok: false as const, error: `Unknown pattern id(s): ${missing.join(", ")}` };
  }

  return { ok: true as const };
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) return jsonError("Invalid JSON body.");

  const venueSlug = String(body.venueSlug ?? "").trim();
  if (!venueSlug) return jsonError("Missing venueSlug.");

  const gamesNorm = normalizeGames(body.games);
  if (!gamesNorm.ok) return jsonError(gamesNorm.error, 400);

  const supabase = createAdminClient();

  // Validate patterns exist (ignore nulls)
  const ids = gamesNorm.rows
    .map((r) => r.pattern_id)
    .filter((x): x is number => typeof x === "number" && Number.isInteger(x));

  const ok = await assertPatternsExist(supabase, ids);
  if (!ok.ok) return jsonError(ok.error, 400);

  // 1) Venue lookup
  const { data: venue, error: venueErr } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (venueErr || !venue?.id) return jsonError("Venue not found.", 404);

  // 2) Determine which event to update
  const explicitEventCode = String(body.eventCode ?? "").trim() || null;

  const eventQuery = supabase
    .from("events")
    .select("id,event_code,status,start_at")
    .eq("venue_id", venue.id);

  const { data: eventRow, error: eventErr } = explicitEventCode
    ? await eventQuery.eq("event_code", explicitEventCode).maybeSingle()
    : await eventQuery
        .eq("status", "active")
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (eventErr) return jsonError(`Event lookup failed: ${eventErr.message}`, 500);
  if (!eventRow?.id) {
    return jsonError(
      explicitEventCode ? "Event not found for this venue." : "No active event found for this venue.",
      404
    );
  }

  // 3) Upsert event_games for provided games
  const rows = gamesNorm.rows.map((r) => ({
    event_id: eventRow.id,
    game_number: r.game_number,
    playlist_key: r.playlist_key,
    display_mode: r.display_mode,
    pattern_id: r.pattern_id,
  }));

  const { error: gamesErr } = await supabase
    .from("event_games")
    .upsert(rows, { onConflict: "event_id,game_number" });

  if (gamesErr) return jsonError(`Failed to update event games: ${gamesErr.message}`, 500);

  // 4) If payload did NOT include bonus (6), delete any existing bonus row
  const includesBonus = gamesNorm.rows.some((r) => r.game_number === 6);
  if (!includesBonus) {
    const { error: delErr } = await supabase
      .from("event_games")
      .delete()
      .eq("event_id", eventRow.id)
      .eq("game_number", 6);

    if (delErr) return jsonError(`Failed to clear bonus game: ${delErr.message}`, 500);
  }

  return NextResponse.json({ ok: true, eventCode: eventRow.event_code });
}
