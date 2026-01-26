import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventCode = (searchParams.get("eventCode") || "").trim();

  if (!eventCode) {
    return NextResponse.json(
      { ok: false, error: "Missing eventCode" },
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

  // Event must be ACTIVE for players
  const { data: event, error: eErr } = await supabase
    .from("events")
    .select(
      `
        id,
        event_code,
        name,
        config_key,
        status,
        event_games (
          game_number,
          playlist_key,
          display_mode,
          pattern_id
        )
      `,
    )
    .eq("event_code", eventCode)
    .eq("status", "active")
    .maybeSingle();

  if (eErr || !event?.id) {
    return NextResponse.json(
      { ok: false, error: "Event not found" },
      { status: 404 },
    );
  }

  const { data: patterns, error: pErr } = await supabase
    .from("patterns")
    .select("id,name,cells")
    .order("id", { ascending: true });

  if (pErr) {
    return NextResponse.json(
      { ok: false, error: pErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    event,
    patterns: patterns ?? [],
  });
}
