import Image from "next/image";
import Link from "next/link";
import { getEventConfig } from "@/lib/eventConfig";

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const eventConfig = getEventConfig(eventId);

  if (!eventConfig) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <p className="text-sm text-slate-300">
            No event configuration for ID:{" "}
            <span className="font-mono text-slate-200">{eventId}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/Elation-Ent-V1.png"
            alt="Elation Entertainment logo"
            width={480}
            height={140}
            className="h-auto w-80 sm:w-96"
            priority
          />
        </div>

        <h1 className="text-3xl font-bold mb-2">Music Video Bingo</h1>
        <p className="text-sm text-slate-300 mb-6">
          Tonight’s event:{" "}
          <span className="text-slate-100 font-semibold">{eventConfig.name}</span>
        </p>

        <Link
          href={`/how-to-play?eventId=${encodeURIComponent(eventId)}`}
          className="inline-flex items-center justify-center w-full px-4 py-3 rounded-md text-sm font-semibold bg-emerald-500 text-black shadow-md hover:bg-emerald-400 transition"
        >
          How to Play
        </Link>

        <div className="mt-3">
          <Link
            href={`/event/${eventId}`}
            className="inline-flex items-center justify-center w-full px-4 py-3 rounded-md text-sm font-semibold bg-slate-100/10 text-slate-100 border border-white/20 shadow-md hover:bg-slate-100/15 hover:border-white/30 transition"
          >
            Get My Cards
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Tip: Keep this page open during the game.
        </p>
      </div>
    </main>
  );
}
