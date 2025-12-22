"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

function slugToTitle(slug: string) {
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function HowToPlayClient() {
  const searchParams = useSearchParams();
  const venueSlug = searchParams.get("venue") || "";

  const venueTitle = useMemo(() => slugToTitle(venueSlug), [venueSlug]);

  // For now, we always route to demo.
  // Later this becomes: active venue -> eventId from DB (Supabase) or mapping.
  const eventId = "dec-22-2025";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100">
      <main className="w-full max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          {/* Optional logo if you have it in /public */}
          {/* <img src="/mvb-logo.png" alt="Music Video Bingo" className="h-16 mx-auto mb-4" /> */}

          <h1 className="text-3xl sm:text-4xl font-bold">How to Play</h1>

          {venueTitle ? (
            <p className="mt-2 text-slate-300">
              Venue: <span className="text-slate-100 font-semibold">{venueTitle}</span>
            </p>
          ) : (
            <p className="mt-2 text-slate-400 text-sm">
              Tip: open this page from a venue QR code for venue-specific access.
            </p>
          )}
        </header>

        {/* Instructions Card */}
        <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md shadow-lg p-5 sm:p-7">
          <h2 className="text-xl font-semibold mb-3">Quick Rules</h2>

          <ul className="space-y-2 text-slate-200 leading-relaxed">
            <li>
              You’ll get a <span className="font-semibold">5×5</span> bingo card. The center square is{" "}
              <span className="font-semibold">FREE</span>.
            </li>
            <li>
              As music videos play, tap squares that match what’s on your card (Title mode or Artist mode).
            </li>
            <li>
              Each game has a <span className="font-semibold">different win pattern</span>. The app highlights the pattern for Games 2–5.
            </li>
            <li>
              If you complete the pattern, yell <span className="font-semibold">“BINGO!”</span> and get the host’s attention.
            </li>
            <li className="text-slate-300">
              Note: You can <span className="font-semibold">reset your taps</span>, but you cannot generate a new card.
            </li>
          </ul>

          {/* Action button */}
          <div className="mt-6 flex justify-center">
            <Link
              href={`/event/${eventId}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold bg-emerald-500 text-black shadow-md hover:bg-emerald-400 transition"
            >
              Get My Cards
            </Link>
          </div>

          {/* Small footer note */}
          <p className="mt-4 text-center text-xs text-slate-400">
            Your card and selections are saved on this device during the event.
          </p>
        </section>
      </main>
    </div>
  );
}
