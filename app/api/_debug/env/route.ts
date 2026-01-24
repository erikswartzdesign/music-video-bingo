// app/api/_debug/env/route.ts
import { NextResponse } from "next/server";

function mask(value: string, keepStart = 6, keepEnd = 4) {
  const v = String(value || "");
  if (!v) return "";
  if (v.length <= keepStart + keepEnd) return `${v.slice(0, 2)}…(${v.length})`;
  return `${v.slice(0, keepStart)}…${v.slice(-keepEnd)}(${v.length})`;
}

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // Client-exposed (build-time) vars will NOT reliably exist here
  // unless you also set them as server vars in Vercel.
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const nextPublicAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return NextResponse.json({
    ok: true,
    server: {
      SUPABASE_URL: {
        present: Boolean(supabaseUrl),
        value: mask(supabaseUrl, 24, 10),
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        present: Boolean(serviceRole),
        value: mask(serviceRole, 10, 10),
      },
    },
    alsoPresentOnServer: {
      NEXT_PUBLIC_SUPABASE_URL: {
        present: Boolean(nextPublicUrl),
        value: mask(nextPublicUrl, 24, 10),
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        present: Boolean(nextPublicAnon),
        value: mask(nextPublicAnon, 10, 10),
      },
    },
  });
}
