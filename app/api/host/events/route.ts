import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventConfig } from "@/lib/eventConfig";

type PostGameBody = {
  gameNumber: number; // 1..6
  playlistKey: string; // e.g. "p6"
  displayMode?: "title" | "artist";
  patternId?: number | null; // null or 1..25
};

type PostBody = {
  venueSlug?: string;
  eventDate?: string; // YYYY-MM-DD
  configKey?: string | null; // legacy fallback only
  name?: string | null;
  makeActive?: boolean;
  games?: PostGameBody[]; // DB-driven config
};

type PatchBody = {
  venueSlug?: string;
  eventCode?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// For now, the platform runs on Denver time.
// Later: read venue.time_zone and use that instead.
const DEFAULT_TIME_ZONE = "America/Denver";

// Future-proof: validate playlists up to 20 for now.
const MAX_PLAYLIST_NUMBER = 20;

function isoDateInTimeZone(tz: string, date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA => YYYY-MM-DD
  return fmt.format(date);
}

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

/**
 * Compute a UTC ISO string for "7:00 PM local time" in a given IANA timezone (DST-aware).
 */
function startAtIsoForTz7pm(eventDate: string, timeZone: string) {
  const [yStr, mStr, dStr] = eventDate.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return new Date(`${eventDate}T19:00:00`).toISOString();
  }

  function tzOffsetMs(utcDate: Date) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = dtf.formatToParts(utcDate);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }

    const asUTC = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    );

    return asUTC - utcDate.getTime();
  }

  const naiveUtcMs = Date.UTC(y, m - 1, d, 19, 0, 0);
  const guess1 = new Date(naiveUtcMs);
  const off1 = tzOffsetMs(guess1);
  let actual = new Date(naiveUtcMs - off1);

  const off2 = tzOffsetMs(actual);
  if (off2 !== off1) {
    actual = new Date(naiveUtcMs - off2);
  }

  return actual.toISOString();
}

/**
 * Legacy fallback: allow configKey to be null/empty (no validation),
 * but if provided, validate against local config registry.
 */
function resolveConfigKey(input?: string | null) {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: true as const, key: null as string | null };

  const cfg = getEventConfig(raw);
  if (!cfg) return { ok: false as const, key: null, error: `Unknown config_key: ${raw}` };

  return { ok: true as const, key: raw };
}

function normalizeGames(input: PostGameBody[] | undefined | null) {
  if (!input || !Array.isArray(input)) return null;

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

    out.push({
      game_number: gameNumber,
      playlist_key: parsed.normalized,
      display_mode: displayMode,
      pattern_id: gameNumber === 1 ? null : patternId,
    });
  }

  // Require 1..5; allow 6 optional
  const nums = new Set(out.map((r) => r.game_number));
  for (let i = 1; i <= 5; i++) {
    if (!nums.has(i)) return { ok: false as const, error: "games must include gameNumber 1–5." };
  }

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

function parseEventDateFromEventCode(eventCode: string) {
  const parts = eventCode.split("--");
  const maybe = parts[parts.length - 1] ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(maybe) ? maybe : null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PostBody | null;
  if (!body) return jsonError("Invalid JSON body.");

  const venueSlug = (body.venueSlug ?? "").trim();
  const eventDate = (body.eventDate ?? "").trim();

  if (!venueSlug) return jsonError("Missing venueSlug.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return jsonError("eventDate must be YYYY-MM-DD.");

  const cfg = resolveConfigKey(body.configKey);
  if (!cfg.ok) return jsonError(cfg.error, 400);

  const gamesNorm = normalizeGames(body.games ?? null);
  if (gamesNorm && !gamesNorm.ok) return jsonError(gamesNorm.error, 400);

  const supabase = createAdminClient();

  // Validate patterns exist (ignore nulls)
  if (gamesNorm && gamesNorm.ok) {
    const ids = gamesNorm.rows
      .map((r) => r.pattern_id)
      .filter((x): x is number => typeof x === "number" && Number.isInteger(x));

    const ok = await assertPatternsExist(supabase, ids);
    if (!ok.ok) return jsonError(ok.error, 400);
  }

  // Look up venue
  const { data: venue, error: venueErr } = await supabase
    .from("venues")
    .select("id, name, slug")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (venueErr || !venue?.id) return jsonError("Venue not found.", 404);

  const timeZone = DEFAULT_TIME_ZONE;

  // Enforce: only TODAY can be activated
  const requestedMakeActive = Boolean(body.makeActive);
  const todayInTz = isoDateInTimeZone(timeZone);

  if (requestedMakeActive && eventDate !== todayInTz) {
    return jsonError(
      `Cannot activate an event for ${eventDate}. Only today's event (${todayInTz}) can be activated. Create it as scheduled and activate it on the day of.`,
      400
    );
  }

  const makeActive = requestedMakeActive && eventDate === todayInTz;

  const eventCode = `${venueSlug}--${eventDate}`;
  const start_at = startAtIsoForTz7pm(eventDate, timeZone);

  const defaultName = `${venue.name ?? venue.slug} — ${eventDate}`;
  const name = (body.name ?? "").trim() || defaultName;

  // If making active, end any current active events for this venue
  if (makeActive) {
    const { error: deactivateErr } = await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("venue_id", venue.id)
      .eq("status", "active");

    if (deactivateErr) return jsonError("Failed to end existing active event.", 500);
  }

  // Upsert event (need id for event_games)
  const { data: upserted, error: upsertErr } = await supabase
    .from("events")
    .upsert(
      {
        venue_id: venue.id,
        event_code: eventCode,
        name,
        start_at,
        status: makeActive ? "active" : "scheduled",
        config_key: cfg.key,
      },
      { onConflict: "event_code" }
    )
    .select("id,event_code,status,config_key,name,start_at")
    .maybeSingle();

  if (upsertErr || !upserted?.id) return jsonError("Failed to create/update event.", 500);

  // Upsert event_games if provided
  if (gamesNorm && gamesNorm.ok) {
    const rows = gamesNorm.rows.map((r) => ({
      event_id: upserted.id,
      game_number: r.game_number,
      playlist_key: r.playlist_key,
      display_mode: r.display_mode,
      pattern_id: r.pattern_id,
    }));

    const { error: gamesErr } = await supabase
      .from("event_games")
      .upsert(rows, { onConflict: "event_id,game_number" });

    if (gamesErr) return jsonError(`Failed to save event games: ${gamesErr.message}`, 500);

    // If payload did NOT include bonus (6), delete any existing bonus row (prevents stale bonus)
    const includesBonus = gamesNorm.rows.some((r) => r.game_number === 6);
    if (!includesBonus) {
      const { error: delErr } = await supabase
        .from("event_games")
        .delete()
        .eq("event_id", upserted.id)
        .eq("game_number", 6);

      if (delErr) return jsonError(`Failed to clear bonus game: ${delErr.message}`, 500);
    }
  }

  return NextResponse.json({ ok: true, event: upserted });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) return jsonError("Invalid JSON body.");

  const venueSlug = (body.venueSlug ?? "").trim();
  const eventCode = (body.eventCode ?? "").trim();
  if (!venueSlug) return jsonError("Missing venueSlug.");
  if (!eventCode) return jsonError("Missing eventCode.");

  const supabase = createAdminClient();

  const { data: venue, error: venueErr } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (venueErr || !venue?.id) return jsonError("Venue not found.", 404);

  const timeZone = DEFAULT_TIME_ZONE;
  const todayInTz = isoDateInTimeZone(timeZone);
  const dateFromCode = parseEventDateFromEventCode(eventCode);

  if (!dateFromCode) return jsonError("Invalid eventCode format.", 400);

  if (dateFromCode !== todayInTz) {
    return jsonError(
      `Cannot activate an event for ${dateFromCode}. Only today's event (${todayInTz}) can be activated.`,
      400
    );
  }

  // End current active
  const { error: deactivateErr } = await supabase
    .from("events")
    .update({ status: "completed" })
    .eq("venue_id", venue.id)
    .eq("status", "active");

  if (deactivateErr) return jsonError("Failed to end existing active event.", 500);

  // Activate requested event
  const { data: activated, error: activateErr } = await supabase
    .from("events")
    .update({ status: "active" })
    .eq("venue_id", venue.id)
    .eq("event_code", eventCode)
    .select("id,event_code,status,config_key,name,start_at")
    .maybeSingle();

  if (activateErr || !activated) return jsonError("Event not found for this venue.", 404);

  return NextResponse.json({ ok: true, event: activated });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { venueSlug?: string } | null;
  if (!body) return jsonError("Invalid JSON body.");

  const venueSlug = (body.venueSlug ?? "").trim();
  if (!venueSlug) return jsonError("Missing venueSlug.");

  const supabase = createAdminClient();

  const { data: venue, error: venueErr } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (venueErr) {
    console.error("[DELETE /api/host/events] venue lookup error:", venueErr);
    return jsonError(`Venue lookup failed: ${venueErr.message}`, 500);
  }

  if (!venue?.id) return jsonError("Venue not found.", 404);

  const { error: deactivateErr } = await supabase
    .from("events")
    .update({ status: "completed" })
    .eq("venue_id", venue.id)
    .eq("status", "active");

  if (deactivateErr) {
    console.error("[DELETE /api/host/events] deactivate error:", deactivateErr);
    return jsonError(`Failed to end active event: ${deactivateErr.message}`, 500);
  }

  return NextResponse.json({ ok: true });
}
