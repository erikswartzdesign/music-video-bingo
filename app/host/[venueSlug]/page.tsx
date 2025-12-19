"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useParams } from "next/navigation";

function slugToTitle(slug: string) {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// TEMP ONLY (global messages) — later from DB
const IMPORTANT_MESSAGES: string[] = [
  "Prototype host dashboard — events are stored in localStorage for now.",
  "Next step: wire this to Supabase so events persist for all hosts.",
];

type HostEvent = {
  id: string;
  venueSlug: string;
  createdAtIso: string;
  eventDate: string;
  activeUntilIso: string;
  games: Array<{
    gameId: string;
    label: string;
    playlistNumber: number;
    mode: "title" | "artist";
    patternId: string;
  }>;
};

function makeStorageKeyActive(venueSlug: string) {
  return `mvb:activeEvent:${venueSlug}`;
}
function makeStorageKeyHistory(venueSlug: string) {
  return `mvb:eventHistory:${venueSlug}`;
}

function isExpired(activeUntilIso: string) {
  const until = Date.parse(activeUntilIso);
  return Number.isFinite(until) ? Date.now() > until : true;
}

export default function HostVenueDashboardPage() {
  const params = useParams<{ venueSlug?: string }>();
  const venueSlug = params?.venueSlug ?? "";
  const venueName = useMemo(() => slugToTitle(venueSlug), [venueSlug]);

  const [activeEvent, setActiveEvent] = useState<HostEvent | null>(null);
  const [history, setHistory] = useState<HostEvent[]>([]);

  // Load from localStorage (client only)
  useEffect(() => {
    if (!venueSlug) return;

    try {
      const activeKey = makeStorageKeyActive(venueSlug);
      const historyKey = makeStorageKeyHistory(venueSlug);

      const rawActive = localStorage.getItem(activeKey);
      const rawHist = localStorage.getItem(historyKey);

      const parsedActive: HostEvent | null = rawActive ? JSON.parse(rawActive) : null;
      const parsedHist: HostEvent[] = rawHist ? JSON.parse(rawHist) : [];

      // Auto-clear expired active event
      if (parsedActive?.activeUntilIso && isExpired(parsedActive.activeUntilIso)) {
        localStorage.removeItem(activeKey);
        setActiveEvent(null);
      } else {
        setActiveEvent(parsedActive);
      }

      setHistory(Array.isArray(parsedHist) ? parsedHist : []);
    } catch {
      setActiveEvent(null);
      setHistory([]);
    }
  }, [venueSlug]);

  const hasActive = Boolean(activeEvent);

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 px-6 py-10">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/mvb-logo.png"
              alt="Music Video Bingo logo"
              width={520}
              height={160}
              className="h-auto w-80 sm:w-96"
              priority
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold">Music Video Bingo</h1>
          <p className="text-sm text-slate-300 mt-2">Host Dashboard</p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 backdrop-blur-md">
            <span className="text-xs text-slate-300">Venue:</span>
            <span className="text-sm font-semibold text-slate-100">
              {venueName || venueSlug || "Unknown Venue"}
            </span>
            {venueSlug && (
              <span className="text-xs text-slate-400 font-mono">({venueSlug})</span>
            )}
          </div>
        </header>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Tonight */}
            <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-lg">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Tonight’s Event
                  {hasActive && (
                    <span className="text-emerald-300 font-semibold">- ACTIVE</span>
                  )}
                </h2>

                {activeEvent ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-slate-200">
                      Active Event:{" "}
                      <span className="font-semibold">{activeEvent.id}</span>
                    </p>
                    <p className="text-xs text-slate-300">
                      Date: <span className="font-mono">{activeEvent.eventDate}</span> •
                      Expires:{" "}
                      <span className="font-mono">{activeEvent.activeUntilIso}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      (Player page will use this active event later.)
                    </p>

                    {/* Button BELOW active event details (darker green) */}
                    <div className="pt-4">
                      <Link
                        href={`/host/${venueSlug}/new-event`}
                        className="inline-flex items-center justify-center px-4 py-3 rounded-md text-sm font-semibold bg-emerald-700 text-white shadow-md hover:bg-emerald-600 transition"
                      >
                        Create New Event
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm text-slate-300">
                      No active event right now. Create one when you’re ready.
                    </p>

                    {/* Button BELOW text (regular green) */}
                    <div className="pt-4">
                      <Link
                        href={`/host/${venueSlug}/new-event`}
                        className="inline-flex items-center justify-center px-4 py-3 rounded-md text-sm font-semibold bg-emerald-500 text-black shadow-md hover:bg-emerald-400 transition"
                      >
                        Create New Event
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/v/${venueSlug}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
                >
                  View Player Welcome Page
                </Link>

                <Link
                  href="/hosts"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
                >
                  Log Out (Prototype)
                </Link>
              </div>
            </section>

            {/* Important Messages */}
            <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md">
              <h2 className="text-sm font-semibold text-slate-100 mb-3">
                Important Messages
              </h2>

              {IMPORTANT_MESSAGES.length ? (
                <ul className="space-y-2 text-sm text-slate-200">
                  {IMPORTANT_MESSAGES.map((msg, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-[2px] text-emerald-300">•</span>
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-300">No messages right now.</p>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold">Event History</h2>
              <p className="text-xs text-slate-400">(localStorage)</p>
            </div>

            <div className="mt-4 space-y-3">
              {history.length ? (
                history.map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-lg border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {evt.id}
                        </p>
                        <p className="text-xs text-slate-300 mt-1">
                          Created:{" "}
                          <span className="font-mono">{evt.createdAtIso}</span>
                        </p>
                        <p className="text-xs text-slate-300 mt-1">
                          Date: <span className="font-mono">{evt.eventDate}</span> •
                          Expires:{" "}
                          <span className="font-mono">{evt.activeUntilIso}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => alert("Duplicate later (next step).")}
                        className="px-3 py-2 rounded-md text-sm font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-300 mt-2">
                  No events yet. Create one to see history here.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
