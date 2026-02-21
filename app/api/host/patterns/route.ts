import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET() {
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
    .from("patterns")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code ?? null },
      { status: 500 },
    );
  }

  const patterns = (data ?? []).map((p: PatternRow) => {
    const cells = toNumberArray(p.cells ?? p.mask ?? []);
    return {
      id: Number(p.id),
      name: String(p.name ?? ""),
      cells,
    };
  });

  return NextResponse.json({ ok: true, patterns });
}
