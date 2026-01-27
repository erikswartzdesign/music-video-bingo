import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const venueSlug = searchParams.get("venueSlug");

    if (!venueSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing venueSlug" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("venues")
      .select("id,slug,name")
      .eq("slug", venueSlug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, venue: data ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
