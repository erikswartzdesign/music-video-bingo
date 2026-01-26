"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

type PublicVenue = {
  id: string;
  slug: string;
  name: string | null;
};

type PublicActiveEvent = {
  event_code: string;
};

export default function VenueWelcomePage() {
  const router = useRouter();
  const params = useParams<{ venueSlug?: string }>();
  const venueSlug = params?.venueSlug ?? "";

  const fallbackVenueTitle = useMemo(() => slugToTitle(venueSlug), [venueSlug]);

  const [state, setState] = useState<LoadState>("loading");
  const [venueNameFromDb, setVenueNameFromDb] = useState<string | null>(null);
  const [venueFound, setVenueFound] = useState<boolean>(false);

  // Active-event redirect
  const [activeEventCode, setActiveEventCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVenueAndActiveEvent() {
      if (!venueSlug) {
        if (!cancelled) {
          setVenueNameFromDb(null);
          setVenueFound(false);
          setActiveEventCode(null);
          setState("error");
        }
        return;
      }

      if (!cancelled) setState("loading");

      try {
        // 1) Load venue via public server endpoint (service-role on server)
        const vRes = await fetch(
          `/api/public/venue?venueSlug=${encodeURIComponent(venueSlug)}`,
          { cache: "no-store" },
        );

        const vJson = await vRes.json();

        if (cancelled) return;

        if (!vRes.ok || !vJson?.ok || !vJson?.venue?.id) {
          setVenueNameFromDb(null);
          setVenueFound(false);
          setActiveEventCode(null);
          setState("ready");
          return;
        }

        const venue = vJson.venue as PublicVenue;
        setVenueNameFromDb(venue.name ?? null);
        setVenueFound(true);

        // 2) Find active event via public server endpoint
        const aRes = await fetch(
          `/api/public/active-event?venueId=${encodeURIComponent(venue.id)}`,
          { cache: "no-store" },
        );

        const aJson = await aRes.json();

        if (cancelled) return;

        if (aRes.ok && aJson?.ok && aJson?.event?.event_code) {
          const code = String((aJson.event as PublicActiveEvent).event_code);
          setActiveEventCode(code);

          // Redirect straight into the player funnel
          router.replace(`/event/${encodeURIComponent(code)}/welcome`);
          return;
        }

        setActiveEventCode(null);
        setState("ready");
      } catch {
        if (cancelled) return;
        setVenueNameFromDb(null);
        setVenueFound(false);
        setActiveEventCode(null);
        setState("error");
      }
    }

    loadVenueAndActiveEvent();
    return () => {
      cancelled = true;
    };
  }, [venueSlug, router]);

  const venueTitle = venueNameFromDb ?? fallbackVenueTitle;

  const isLoading = state === "loading";
  const showNotFound = !isLoading && Boolean(venueSlug) && !venueFound;
  const showNoActive = !isLoading && venueFound && !activeEventCode;

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
          <p className="text-2xl text-slate-300 mb-8">Loading…</p>
        ) : showNotFound ? (
          <div className="mb-8">
            <p className="text-2xl text-slate-200 font-semibold">
              Venue not found
            </p>
            <p className="text-sm text-slate-400 mt-2">
              You entered:{" "}
              <span className="font-mono text-slate-200">{venueSlug}</span>
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Please rescan the venue QR code.
            </p>
          </div>
        ) : showNoActive ? (
          <div className="mb-8">
            <p className="text-2xl text-slate-200 font-semibold">
              {venueTitle}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              No active event right now.
            </p>
            <p className="text-sm text-slate-400 mt-1">
              If trivia is about to start, refresh in a moment or ask your host
              to activate tonight’s event.
            </p>
          </div>
        ) : (
          <p className="text-2xl text-slate-300 mb-8">{venueTitle}</p>
        )}

        <div className="flex flex-col gap-3 items-center">
          <Link
            href={
              showNotFound
                ? "#"
                : `/how-to-play?venue=${encodeURIComponent(venueSlug)}`
            }
            aria-disabled={showNotFound}
            className={[
              "inline-flex items-center justify-center w-full max-w-[260px] mx-auto px-6 py-3 rounded-md text-lg font-semibold shadow-md transition",
              "bg-emerald-500 text-black",
              showNotFound
                ? "pointer-events-none opacity-60"
                : "hover:bg-emerald-400",
            ].join(" ")}
          >
            How to Play
          </Link>

          {showNoActive && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center w-full max-w-[260px] mx-auto px-6 py-3 rounded-md text-lg font-semibold shadow-md transition bg-slate-100/10 text-slate-100 border border-white/20 hover:bg-slate-100/15 hover:border-white/30"
            >
              Refresh
            </button>
          )}
        </div>

        {!isLoading && !showNotFound && activeEventCode && (
          <p className="text-xs text-slate-500 mt-6">
            Redirecting to tonight’s event…
          </p>
        )}
      </div>
    </main>
  );
}
