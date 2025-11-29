"use client";

import Link from "next/link";
import { EVENTS } from "@/lib/eventConfig";

export default function HostEventsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Host – Events</h1>
      <p className="mb-4 text-center max-w-xl">
        This is a simple host view showing all configured events. In the
        future, you&apos;ll be able to create new events and set their
        playlists here. For now, click an event to open its player view.
      </p>

      <div className="w-full max-w-xl space-y-3">
        {EVENTS.map((event) => (
          <div
            key={event.id}
            className="border rounded-lg p-3 flex items-center justify-between bg-white"
          >
            <div>
              <p className="font-semibold">{event.name}</p>
              <p className="text-sm text-gray-600">ID: {event.id}</p>
              <p className="text-xs text-gray-500">
                Games: {event.games.map((g) => g.name).join(", ")}
              </p>
            </div>
            <Link
              href={`/event/${event.id}`}
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Open Event
            </Link>
          </div>
        ))}

        {EVENTS.length === 0 && (
          <p className="text-center text-gray-600">
            No events configured yet. Add one in <code>lib/eventConfig.ts</code>
            .
          </p>
        )}
      </div>
    </main>
  );
}
