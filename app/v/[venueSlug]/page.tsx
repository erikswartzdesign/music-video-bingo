"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugToTitle(slug: string) {
  const safe = (slug || "").trim();
  if (!safe) return "";
  return safe
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type LoadState = "loading" | "ready" | "error";

export default function VenueWelcomePage() {
  const params = useParams<{ venueSlug?: string }>();
  const venueSlug = params?.venueSlug ?? "";

  const fallbackVenueTitle = useMemo(() => slugToTitle(venueSlug), [venueSlug]);

  const [state, setState] = useState<LoadState>("loading");
  const [venueNameFromDb, setVenueNameFromDb] = useState<string | null>(null);
  const [venueFound, setVenueFound] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function loadVenue() {
      if (!venueSlug) {
        if (!cancelled) {
          setVenueNameFromDb(null);
          setVenueFound(false);
          setState("error");
        }
        return;
      }

      if (!cancelled) setState("loading");

      try {
        const supabase = createClient();
        const { data: venue, error } = await supabase
          .from("venues")
          .select("name")
          .eq("slug", venueSlug)
          .maybeSingle();

        if (cancelled) return;

        if (error || !venue) {
          setVenueNameFromDb(null);
          setVenueFound(false);
          setState("ready");
          return;
        }

        setVenueNameFromDb(venue.name ?? null);
        setVenueFound(true);
        setState("ready");
      } catch {
        if (cancelled) return;
        setVenueNameFromDb(null);
        setVenueFound(false);
        setState("error");
      }
    }

    loadVenue();
    return () => {
      cancelled = true;
    };
  }, [venueSlug]);

  const venueTitle = venueNameFromDb ?? fallbackVenueTitle;

  const isLoading = state === "loading";
  const showNotFound = !isLoading && Boolean(venueSlug) && !venueFound;

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/Elation-Ent-V1.png"
            alt="Music Video Bingo logo"
            width={520}
            height={160}
            className="h-auto w-100 sm:w-96"
            priority
          />
        </div>

        <h1 className="text-4xl font-bold mb-2">Music Video Bingo</h1>

        {isLoading ? (
          <p className="text-2xl text-slate-300 mb-8">Loading venue…</p>
        ) : showNotFound ? (
          <div className="mb-8">
            <p className="text-2xl text-slate-200 font-semibold">Venue not found</p>
            <p className="text-sm text-slate-400 mt-2">
              You entered: <span className="font-mono text-slate-200">{venueSlug}</span>
            </p>
            <p className="text-sm text-slate-400 mt-1">Please rescan the venue QR code.</p>
          </div>
        ) : (
          <p className="text-2xl text-slate-300 mb-8">{venueTitle}</p>
        )}

        <Link
          href={showNotFound ? "#" : `/how-to-play?venue=${venueSlug}`}
          aria-disabled={showNotFound}
          className={[
            "inline-flex items-center justify-center w-full max-w-[220px] mx-auto px-6 py-3 rounded-md text-lg font-semibold shadow-md transition",
            "bg-emerald-500 text-black",
            showNotFound ? "pointer-events-none opacity-60" : "hover:bg-emerald-400",
          ].join(" ")}
        >
          How to Play
        </Link>
      </div>
    </main>
  );
}
