"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// TEMP ONLY (mock "database")
// username = venue slug (or venue name), password = temp password
const TEMP_HOST_CREDENTIALS: Record<string, { password: string; venueSlug: string }> = {
  "denver-taphouse": { password: "changeme123", venueSlug: "denver-taphouse" },
  "demo-venue": { password: "demo123", venueSlug: "demo-venue" },
};

// TEMP ONLY (global message area)
// Replace this later with DB-driven notices (Supabase)
const IMPORTANT_MESSAGES: string[] = [
  "Welcome! This is the host portal prototype.",
  "If you have issues logging in, contact your admin for a password reset.",
  "Reminder: Events auto-expire after the configured end time.",
];

export default function HostsLandingPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const record = TEMP_HOST_CREDENTIALS[normalizedUsername];

    if (!record) {
      setError("Unknown venue username.");
      return;
    }

    if (password !== record.password) {
      setError("Incorrect password.");
      return;
    }

    // Send host to their venue dashboard (we’ll build this page next)
    router.push(`/host/${record.venueSlug}`);
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
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

          <h1 className="text-2xl sm:text-3xl font-bold">Host Login</h1>
          <p className="text-sm text-slate-300 mt-2">
            Enter your venue username and password to manage tonight&apos;s event.
          </p>
        </div>

        <section className="bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-lg">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., denver-taphouse"
                className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Temporary password"
                className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-md text-sm font-semibold bg-emerald-500 text-black shadow-md hover:bg-emerald-400 transition"
            >
              Log In
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              (Prototype login only — this is not real security yet.)
            </p>
          </form>
        </section>

        <section className="mt-5 bg-white/10 border border-white/15 rounded-xl p-5 sm:p-6 backdrop-blur-md">
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
    </main>
  );
}
