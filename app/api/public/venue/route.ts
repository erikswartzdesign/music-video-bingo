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

  const { data, error } = await supabase
    .from("venues")
    .select("id,slug,name")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (error || !data?.id) {
    return NextResponse.json(
      { ok: false, error: "Venue not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, venue: data });
}
