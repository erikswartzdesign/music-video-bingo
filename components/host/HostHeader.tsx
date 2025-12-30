"use client";

import Image from "next/image";

type Props = {
  venueNameDisplay: string;
  venueSlug: string;
};

export default function HostHeader({ venueNameDisplay, venueSlug }: Props) {
  return (
    <header className="text-center mb-8">
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

      <h1 className="text-2xl sm:text-3xl font-bold">Music Video Bingo</h1>
      <p className="text-sm text-slate-300 mt-2">Host Dashboard</p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 backdrop-blur-md">
        <span className="text-xs text-slate-300">Venue:</span>
        <span className="text-sm font-semibold text-slate-100">{venueNameDisplay}</span>
        {venueSlug && <span className="text-xs text-slate-400 font-mono">({venueSlug})</span>}
      </div>
    </header>
  );
}
