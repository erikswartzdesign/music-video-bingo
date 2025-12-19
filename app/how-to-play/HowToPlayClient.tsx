"use client";

import { useSearchParams } from "next/navigation";
// keep your other imports here (logo, ACTIVE_VENUES, etc.)

export default function HowToPlayClient() {
  const searchParams = useSearchParams();
  const venue = searchParams.get("venue") || "";

  // ✅ PASTE/PORT your existing how-to-play logic + JSX here
  // You can keep using `venue` exactly like you were.
  // Return your existing page markup.

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100">
      {/* replace this placeholder with your existing content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">How to Play</h1>
        <p className="text-slate-300">Venue: <span className="font-mono">{venue || "—"}</span></p>
      </div>
    </div>
  );
}
