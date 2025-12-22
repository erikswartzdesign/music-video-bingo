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

          <h1 className="text-4xl sm:text-4xl font-bold">How to Play</h1>

          {venueTitle ? (
            <p className="mt-2 text-slate-300">
              Venue: <span className="text-lg text-slate-100 font-semibold">{venueTitle}</span>
            </p>
          ) : (
            <p className="mt-2 text-slate-400 text-sm">
              Tip: open this page from a venue QR code for venue-specific access.
            </p>
          )}
        </header>

        {/* Instructions Card */}
        <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md shadow-lg p-5 sm:p-7">
          <h2 className="text-xl font-semibold mb-3">Instructions For Mobile Play</h2>

          <ul className="space-y-6 text-slate-200 leading-relaxed">
            <li>
              *** Please read through these instructions so you are aware of how to play the game on your mobile device! ***
            </li>
            <li>
              • After reading through the instructions, click the "Get My Cards" button.
            </li>
            <li>
              • When you see the buttons for each of the five games, go ahead and select them one by one. This will temporarily save each card to your device so you don't lose progress during this event.
            </li>
            <li>
              • For each game you’ll get a <span className="font-semibold">5×5</span> bingo card. The center square is{" "}
              <span className="font-semibold">FREE</span>.
            </li>
            <li>
              • As the music videos play, tap any squares that match the videos that have played.
            </li>
            <li>
              • If a game has a particular pattern required to win, you will see the pattern indicated by a dark green background. Selecting a square that is part of the pattern will change the square background to bright green. If you select a square outside of the pattern, the square background will turn to dark red. This helps you keep track of what has played while visually indicating your progress toward the winning pattern.
            </li>
            <li>
              • If you are the first to successfully complete the pattern, make sure to yell <span className="font-semibold">“BINGO!”</span> loudly to tell the host and other players that you are the potential winner of that game!
            </li>
            <li>
              • If you accidentally hit an incorrect square, just tap it again to clear it. If you need to clear the entire card, use the Reset Progress button.<br />
              <span className="italic">NOTE: This will only clear all of the selected squares from the card, but will not generate a new card for you.</span>
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
