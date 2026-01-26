"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type VenueRow = {
  slug: string;
  name: string | null;
};

export default function HostsLandingPage() {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVenues() {
      setLoading(true);
      setErrMsg(null);

      try {
        const res = await fetch("/api/host/venues", { cache: "no-store" });
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok || !json?.ok) {
          setErrMsg("Could not load venues.");
          setVenues([]);
          setLoading(false);
          return;
        }

        setVenues((json.venues ?? []) as VenueRow[]);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setErrMsg("Could not load venues.");
        setVenues([]);
        setLoading(false);
      }
    }

    loadVenues();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((v) => {
      const name = (v.name ?? "").toLowerCase();
      return v.slug.toLowerCase().includes(q) || name.includes(q);
    });
  }, [venues, query]);

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/Elation-Ent-V1.png"
              alt="Music Video Bingo logo"
              width={520}
              height={160}
              className="h-auto w-80 sm:w-96"
              priority
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold">Host Portal</h1>
          <p className="text-sm text-slate-300 mt-2">
            Select your venue to manage tonight&apos;s event.
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            (Prototype access — we’ll add real login later.)
          </p>
        </div>

        <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-lg">
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Search
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type venue name or slug"
            className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />

          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-slate-300">Loading venues…</p>
            ) : errMsg ? (
              <p className="text-sm text-red-200">{errMsg}</p>
            ) : filtered.length ? (
              <div className="space-y-2">
                {filtered.map((v) => (
                  <Link
                    key={v.slug}
                    href={`/host/${v.slug}`}
                    className="block rounded-md border border-white/15 bg-black/20 px-3 py-3 hover:bg-black/30 transition"
                  >
                    <div className="text-sm font-semibold text-slate-100">
                      {v.name ?? v.slug}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {v.slug}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300">No venues found.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
