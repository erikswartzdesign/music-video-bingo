import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PatternRow = {
  id: number | string;
  name: string;
  // local schema uses cells; prod might use mask
  cells?: unknown;
  mask?: unknown;
};

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isFinite(n));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventCode = searchParams.get("eventCode");

    if (!eventCode) {
      return NextResponse.json(
        { ok: false, error: "Missing eventCode" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        `
        id,
        event_code,
        start_at,
        status,
        venue_id,
        event_games (
          game_number,
          display_mode,
          playlist_key,
          pattern_id
        )
      `,
      )
      .eq("event_code", eventCode)
      .maybeSingle();

    if (eventError) {
      return NextResponse.json(
        { ok: false, error: eventError.message },
        { status: 500 },
      );
    }

    const status = (event?.status ?? "").toString().toLowerCase();
    if (!event || status !== "active") {
      return NextResponse.json({ ok: true, event: null, patterns: [] });
    }

    const { data: patternRows, error: patternsError } = await supabase
      .from("patterns")
      .select("*")
      .order("name", { ascending: true });

    if (patternsError) {
      return NextResponse.json(
        { ok: false, error: patternsError.message },
        { status: 500 },
      );
    }

    const patterns = (patternRows ?? []).map((p: PatternRow) => {
      // Normalize to "cells" in 1..25 (what the UI expects)
      // If prod has "mask" instead, treat it as cells.
      const cells = toNumberArray(p.cells ?? p.mask ?? []);

      return {
        id: Number(p.id),
        name: String(p.name ?? ""),
        cells,
      };
    });

    return NextResponse.json({
      ok: true,
      event: {
        id: event.id,
        event_code: event.event_code,
        start_at: event.start_at,
        status: event.status,
        venue_id: event.venue_id,
        event_games: event.event_games ?? [],
      },
      patterns,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
