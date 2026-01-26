import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const venueSlug = (searchParams.get("venueSlug") || "").trim();

  if (!venueSlug) {
    return NextResponse.json(
      { ok: false, error: "Missing venueSlug" },
      { status: 400 },
    );
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Venue
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id,slug,name")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (vErr || !venue?.id) {
    return NextResponse.json(
      { ok: false, error: "Venue not found" },
      { status: 404 },
    );
  }

  // 2) Events
  const { data: events, error: eErr } = await supabase
    .from("events")
    .select("id,event_code,name,start_at,status,config_key,venue_id")
    .eq("venue_id", venue.id)
    .order("start_at", { ascending: false })
    .limit(25);

  if (eErr) {
    return NextResponse.json(
      { ok: false, error: eErr.message },
      { status: 500 },
    );
  }

  const eventList = events ?? [];
  const ids = eventList.map((e) => e.id).filter(Boolean);

  // 3) event_games for those events
  let eventGames: any[] = [];
  if (ids.length) {
    const { data: gameRows, error: gErr } = await supabase
      .from("event_games")
      .select("event_id,game_number,playlist_key,display_mode,pattern_id")
      .in("event_id", ids)
      .order("game_number", { ascending: true });

    if (gErr) {
      return NextResponse.json(
        { ok: false, error: gErr.message },
        { status: 500 },
      );
    }

    eventGames = gameRows ?? [];
  }

  return NextResponse.json({
    ok: true,
    venue,
    events: eventList,
    eventGames,
  });
}
