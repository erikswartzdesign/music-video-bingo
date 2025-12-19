import { Suspense } from "react";
import HowToPlayClient from "./HowToPlayClient";

export default function HowToPlayPage() {
  return (
    <Suspense fallback={<HowToPlayFallback />}>
      <HowToPlayClient />
    </Suspense>
  );
}

function HowToPlayFallback() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">How to Play</h1>
        <p className="text-sm text-slate-300">Loading…</p>
      </div>
    </div>
  );
}
