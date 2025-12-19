"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/**
 * TEMP (prototype):
 * Hardcode which venues are "active" and what eventId they should use.
 * Later, this will come from your database + host dashboard activation.
 */
const ACTIVE_VENUES: Record<
  string,
  {
    eventId: string;
    activeUntilIso?: string; // if omitted, treated as active
  }
> = {
  "demo-venue": { eventId: "demo", activeUntilIso: "2099-01-01T00:00:00Z" },
  "denver-taphouse": { eventId: "demo", activeUntilIso: "2099-01-01T00:00:00Z" },
};

function slugToTitle(slug: string) {
  const safe = (slug || "").trim();
  if (!safe) return "";
  return safe
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function HowToPlayPage() {
  const searchParams = useSearchParams();
  const venueSlug = (searchParams.get("venue") || "").trim();

  // Poll time every 15 seconds so "Get Your Cards" can appear automatically.
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const venueTitle = useMemo(() => slugToTitle(venueSlug), [venueSlug]);

  const status = useMemo(() => {
    const entry = venueSlug ? ACTIVE_VENUES[venueSlug] : undefined;
    if (!entry) return { isActive: false as const, eventId: null as string | null };

    if (!entry.activeUntilIso) return { isActive: true as const, eventId: entry.eventId };

    const until = new Date(entry.activeUntilIso).getTime();
    const isActive = nowTs < until;

    return { isActive, eventId: isActive ? entry.eventId : null };
  }, [venueSlug, nowTs]);

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <header className="mb-6 text-center">
          <div className="mb-5 flex justify-center">
            <Image
              src="/mvb-logo.png"
              alt="Music Video Bingo logo"
              width={520}
              height={160}
              className="h-auto w-80 sm:w-96"
              priority
            />
          </div>

          <h1 className="text-3xl font-bold mb-2">Music Video Bingo</h1>

          {venueSlug ? (
            <p className="text-lg text-slate-300">{venueTitle}</p>
          ) : (
            <p className="text-sm text-slate-300">
              (Venue not specified — please rescan the venue QR code.)
            </p>
          )}
        </header>

        <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md">
          <h2 className="text-xl font-semibold mb-3">How to Play</h2>

          <div className="space-y-3 text-sm text-slate-200 leading-relaxed">
            <p>
              This is placeholder instruction text. You’ll replace this later with your
              full walkthrough.
            </p>
            <p>
              Select the correct game (Game 1–Game 5), then tap squares as music videos play.
              If you tap by mistake, tap again to undo.
            </p>
            <p>
              Some games may use special patterns. The host will announce the rules for each game.
            </p>
          </div>

          <div className="mt-6">
            {!status.isActive ? (
              <div className="bg-black/20 border border-white/15 rounded-lg p-4">
                <p className="text-sm text-slate-200">
                  There is no current active event. Please wait for the host to activate the next event.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  This page will automatically refresh.
                </p>
              </div>
            ) : (
              <Link
                href={`/event/${status.eventId}`}
                className="inline-flex items-center justify-center w-full px-4 py-3 rounded-md text-sm font-semibold bg-emerald-500 text-black shadow-md hover:bg-emerald-400 transition"
              >
                Get Your Cards
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
