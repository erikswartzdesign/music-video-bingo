import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json(
        { ok: false, error: "Missing venueId" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Expecting at most one active event per venue.
    // If your schema differs, adjust the filter to match your "active" definition.
    const { data, error } = await supabase
      .from("events")
      .select("event_code,start_at,status")
      .eq("venue_id", venueId)
      .eq("status", "active")
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const event = data
      ? { event_code: data.event_code, start_at: data.start_at }
      : null;

    return NextResponse.json({ ok: true, event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
