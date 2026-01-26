// app/api/debug/venues/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing server env vars",
        detail: {
          hasUrl: !!url,
          hasServiceRole: !!serviceKey,
          urlSource: process.env.SUPABASE_URL
            ? "SUPABASE_URL"
            : process.env.NEXT_PUBLIC_SUPABASE_URL
              ? "NEXT_PUBLIC_SUPABASE_URL"
              : null,
        },
      },
      { status: 500 },
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("venues")
    .select("id, slug, name")
    .order("name", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code ?? null,
        hint: (error as any).hint ?? null,
        details: (error as any).details ?? null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    count: data?.length ?? 0,
    venues: data ?? [],
  });
}
