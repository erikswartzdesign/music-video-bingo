"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugToTitle(slug: string) {
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type LoadState = "idle" | "loading" | "ready" | "error";

export default function HowToPlayClient() {
  const searchParams = useSearchParams();

  // ✅ Tonight: allow explicit eventId override (no Supabase).
  const eventIdParam = (searchParams.get("eventId") || "").trim();

  // Existing venue-based behavior
  const venueSlug = (searchParams.get("venue") || "").trim();
  const fallbackVenueTitle = useMemo(() => slugToTitle(venueSlug), [venueSlug]);

  const [state, setState] = useState<LoadState>("idle");
  const [venueNameFromDb, setVenueNameFromDb] = useState<string | null>(null);
  const [venueFound, setVenueFound] = useState<boolean>(false);
  const [activeEventCode, setActiveEventCode] = useState<string | null>(null);

  // ✅ If eventId is provided, we do NOT hit Supabase at all.
  const useLocalOnly = Boolean(eventIdParam);

  useEffect(() => {
    let cancelled = false;

    async function loadVenueAndActiveEvent() {
      // Local-only mode: bypass DB entirely
      if (useLocalOnly) {
        if (!cancelled) {
          setVenueNameFromDb(null);
          setVenueFound(false);
          setActiveEventCode(eventIdParam);
          setState("ready");
        }
        return;
      }

      // If no venue param (and no eventId override), we do NOT attempt any fallback event.
      if (!venueSlug) {
        if (!cancelled) {
          setVenueNameFromDb(null);
          setVenueFound(false);
          setActiveEventCode(null);
          setState("ready");
        }
        return;
      }

      if (!cancelled) setState("loading");

      try {
        const supabase = createClient();

        // 1) Find venue by slug
        const { data: venue, error: venueError } = await supabase
          .from("venues")
          .select("id, name")
          .eq("slug", venueSlug)
          .maybeSingle();

        if (venueError || !venue?.id) {
          if (!cancelled) {
            setVenueNameFromDb(null);
            setVenueFound(false);
            setActiveEventCode(null);
            setState("ready");
          }
          return;
        }

        if (!cancelled) {
          setVenueNameFromDb(venue.name ?? null);
          setVenueFound(true);
        }

        // 2) Find active event_code for this venue
        const { data: eventRow, error: eventError } = await supabase
          .from("events")
          .select("event_code")
          .eq("venue_id", venue.id)
          .eq("status", "active")
          .order("start_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (eventError) {
          if (!cancelled) {
            setActiveEventCode(null);
            setState("error");
          }
          return;
        }

        if (!cancelled) {
          setActiveEventCode(eventRow?.event_code ?? null);
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setVenueNameFromDb(null);
          setVenueFound(false);
          setActiveEventCode(null);
          setState("error");
        }
      }
    }

    loadVenueAndActiveEvent();
    return () => {
      cancelled = true;
    };
  }, [venueSlug, useLocalOnly, eventIdParam]);

  const isLoading = state === "loading";

  const showTip = !useLocalOnly && !venueSlug;
  const showVenueNotFound = !useLocalOnly && Boolean(venueSlug) && !isLoading && !venueFound;

  const showNoActiveEvent =
    !useLocalOnly && Boolean(venueSlug) && venueFound && !isLoading && !activeEventCode;

  // ✅ Event code comes from explicit eventId OR DB active event
  const eventCode = useLocalOnly ? eventIdParam : activeEventCode;

  const disableGetCards = isLoading || showTip || showVenueNotFound || showNoActiveEvent || !eventCode;

  const venueTitle = venueNameFromDb ?? fallbackVenueTitle;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100">
      <main className="w-full max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-5xl sm:text-5xl text-blue-400 font-bold">How to Play</h1>

          {useLocalOnly ? (
            <div className="mt-2">
              <p className="text-slate-300">
                Event: <span className="text-lg text-slate-100 font-semibold">{eventIdParam}</span>
              </p>
            </div>
          ) : showTip ? (
            <div className="mt-2">
              <p className="text-slate-400 text-sm">
                Tip: open this page from a venue QR code for venue-specific access.
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Please rescan the venue QR code to continue.
              </p>
            </div>
          ) : showVenueNotFound ? (
            <div className="mt-2">
              <p className="text-slate-200 font-semibold text-xl">Venue not found</p>
              <p className="text-slate-400 text-sm mt-1">
                You entered:{" "}
                <span className="font-semibold text-slate-200">
                  {fallbackVenueTitle || venueSlug}
                </span>
              </p>
              <p className="text-slate-400 text-sm">Please rescan the venue QR code.</p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-slate-300">
                Venue:{" "}
                <span className="text-lg text-slate-100 font-semibold">{venueTitle}</span>
              </p>

              {showNoActiveEvent && (
                <p className="mt-2 text-yellow-300 text-sm">
                  No active event right now. Please ask your host to activate tonight’s event.
                </p>
              )}
            </div>
          )}
        </header>

        <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md shadow-lg p-5 sm:p-7">
          <ul className="space-y-8 text-xl text-slate-200 leading-relaxed">
            <li>
              <span className="text-yellow-400 font-semibold">
                Please read through these instructions so you are aware of how to play the game on
                your mobile device!
              </span>
            </li>
            <li>• After reading through the instructions, click the "Get My Cards" button.</li>
            <li>
              • When you see the buttons for each of the five games, go ahead and select them one
              by one. This will temporarily save each card to your device so you don't lose progress
              during this event.
            </li>
            <li>
              • For each game you’ll get a <span className="font-semibold">5×5</span> bingo card.
              The center square is <span className="font-semibold">FREE</span>.
            </li>
            <li>• As the music videos play, tap any squares that match the videos that have played.</li>
            <li>
              • If a game has a particular pattern required to win, you will see the pattern
              indicated by a dark green background. Selecting a square that is part of the pattern
              will change the square background to bright green. If you select a square outside of
              the pattern, the square background will turn to dark red.
            </li>
            <li>
              • If you are the first to successfully complete the pattern, make sure to yell{" "}
              <span className="font-semibold">“BINGO!”</span> loudly!
            </li>
            <li>
              • If you accidentally hit an incorrect square, just tap it again to clear it. If you
              need to clear the entire card, use the Reset Progress button.
              <br />
              <span className="italic text-blue-400">
                NOTE: This clears selections but does not generate a new card.
              </span>
            </li>
          </ul>

          <div className="mt-6 flex justify-center">
            <Link
              href={disableGetCards ? "#" : `/event/${encodeURIComponent(eventCode!)}`}
              aria-disabled={disableGetCards}
              className={[
                "inline-flex items-center justify-center w-full px-6 py-3 rounded-lg font-semibold shadow-md transition",
                "bg-emerald-500 text-black",
                disableGetCards ? "pointer-events-none opacity-60" : "hover:bg-emerald-400",
              ].join(" ")}
            >
              {isLoading ? "Loading Event..." : "Get My Cards"}
            </Link>
          </div>

          {/* ✅ Helpful nav for tonight when using the welcome funnel */}
          {useLocalOnly && (
            <div className="mt-3 flex justify-center">
              <Link
                href={`/event/${encodeURIComponent(eventIdParam)}/welcome`}
                className="text-sm text-slate-300 hover:text-slate-100 underline underline-offset-4"
              >
                Back to Welcome
              </Link>
            </div>
          )}

          <p className="mt-4 text-center text-xl text-yellow-400">
            Thanks for playing, and GOOD LUCK!
          </p>
        </section>
      </main>
    </div>
  );
}
