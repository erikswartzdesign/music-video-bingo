import { NextResponse } from "next/server";

function mask(value: string, keep = 6) {
  const v = String(value || "");
  if (!v) return "";
  if (v.length <= keep) return v;
  return `${v.slice(0, keep)}…(${v.length})`;
}

export async function GET() {
  const pubUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const pubAnon = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
  const service = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");

  return NextResponse.json({
    ok: true,
    serverSeen: {
      NEXT_PUBLIC_SUPABASE_URL: {
        present: Boolean(pubUrl),
        masked: mask(pubUrl, 24),
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        present: Boolean(pubAnon),
        masked: mask(pubAnon, 10),
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        present: Boolean(service),
        masked: mask(service, 10),
      },
    },
  });
}
