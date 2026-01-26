// app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(val?: string) {
  if (!val) return null;
  const s = String(val);
  if (s.length <= 10) return `${s.slice(0, 2)}…${s.slice(-2)}`;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function present(val?: string) {
  return {
    present: !!val,
    masked: mask(val),
    length: val ? String(val).length : 0,
  };
}

export async function GET() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV ?? null,
    server: {
      SUPABASE_URL: present(SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: present(SUPABASE_SERVICE_ROLE_KEY),
    },
    public_on_server: {
      NEXT_PUBLIC_SUPABASE_URL: present(NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: present(NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
  });
}
