// app/api/host/events/config/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  venueSlug?: string;
  eventCode?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return jsonError("Invalid JSON body.");

  const venueSlug = (body.venueSlug ?? "").trim();
  const eventCode = (body.eventCode ?? "").trim();

  if (!venueSlug) return jsonError("Missing venueSlug.");
  if (!eventCode) return jsonError("Missing eventCode.");

  const supabase = createAdminClient();

  // 1) Find venue (validate venueSlug exists)
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (vErr) return jsonError(`Venue lookup failed: ${vErr.message}`, 500);
  if (!venue?.id) return jsonError("Venue not found.", 404);

  // 2) Find event by event_code
  const { data: evt, error: eErr } = await supabase
    .from("events")
    .select("id, venue_id")
    .eq("event_code", eventCode)
    .maybeSingle();

  if (eErr) return jsonError(`Event lookup failed: ${eErr.message}`, 500);
  if (!evt?.id) return jsonError("Event not found (by eventCode).", 404);

  // If event exists but belongs to a different venue, treat as not found for this venue.
  if (String(evt.venue_id) !== String(venue.id)) {
    return jsonError("Event not found for this venue.", 404);
  }

  // 3) Load ALL event_games for that event (including game 6 as bonus)
  const { data: allRows, error: allErr } = await supabase
    .from("event_games")
    .select("game_number,playlist_key,display_mode,pattern_id")
    .eq("event_id", evt.id)
    .order("game_number", { ascending: true });

  if (allErr)
    return jsonError(`Event games lookup failed: ${allErr.message}`, 500);

  const normalizedAll = (Array.isArray(allRows) ? allRows : []).map(
    (r: any) => ({
      game_number: Number(r.game_number),
      playlist_key: String(r.playlist_key ?? ""),
      display_mode: (r.display_mode ?? "title") as "title" | "artist",
      pattern_id: r.pattern_id ?? null,
    }),
  );

  const games = normalizedAll.filter(
    (r) => r.game_number >= 1 && r.game_number <= 5,
  );

  const bonusRow = normalizedAll.find((r) => r.game_number === 6) ?? null;
  const bonus = bonusRow?.playlist_key
    ? {
        playlist_key: bonusRow.playlist_key,
        display_mode: bonusRow.display_mode,
      }
    : null;

  return NextResponse.json({ ok: true, games, bonus });
}
