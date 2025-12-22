"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";


/**
 * TEMP (prototype):
 * Hardcode which venues are "active" and what eventId they should use.
 * Later, this will come from your database + host dashboard activation.
 */
const ACTIVE_VENUES: Record<
  string,
  {
    eventId: string;
    // ISO timestamp; if omitted, venue is treated as active
    activeUntilIso?: string;
  }
> = {
  // Change/add slugs here for testing
  "demo-venue": { eventId: "demo", activeUntilIso: "2099-01-01T00:00:00Z" },
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


export default function VenueWelcomePage() {
  const params = useParams<{ venueSlug?: string }>();
  const venueSlug = params?.venueSlug ?? "";


  // For polling-style behavior (auto update), we just re-evaluate time every 15s.
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const venueTitle = useMemo(() => slugToTitle(venueSlug), [venueSlug]);

  const status = useMemo(() => {
    const entry = ACTIVE_VENUES[venueSlug];
    if (!entry) return { isActive: false as const, eventId: null as string | null };

    if (!entry.activeUntilIso) return { isActive: true as const, eventId: entry.eventId };

    const until = new Date(entry.activeUntilIso).getTime();
    const isActive = nowTs < until;

    return { isActive, eventId: isActive ? entry.eventId : null };
  }, [venueSlug, nowTs]);

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/Windfall-W.png"
            alt="Music Video Bingo logo"
            width={520}
            height={160}
            className="h-auto w-80 sm:w-96"
            priority
          />
        </div>

        <h1 className="text-4xl font-bold mb-2">Music Video Bingo</h1>
        <p className="text-2xl text-slate-300 mb-8">{venueTitle}</p>

        <Link
  href={`/how-to-play?venue=${venueSlug}`}
  className="inline-flex items-center justify-center w-full max-w-[220px] mx-auto px-6 py-3 rounded-md text-lg font-semibold bg-emerald-500 text-black shadow-md hover:bg-emerald-400 transition"
>
  How to Play
</Link>




      </div>
    </main>
  );
}
