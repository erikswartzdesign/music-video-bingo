"use client";

import { useEffect, useMemo, useState } from "react";

type ServerEnvResp = {
  ok: boolean;
  serverSeen?: any;
  error?: string;
};

type ProbeResult = {
  ok: boolean;
  status?: number;
  note?: string;
};

export default function DebugEnvPage() {
  const [serverEnv, setServerEnv] = useState<ServerEnvResp | null>(null);
  const [serverEnvErr, setServerEnvErr] = useState<string | null>(null);

  const [probe, setProbe] = useState<ProbeResult | null>(null);

  // These are compile-time in the client bundle
  const clientPubUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const clientAnon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  const clientSummary = useMemo(() => {
    return {
      NEXT_PUBLIC_SUPABASE_URL: {
        present: Boolean(clientPubUrl),
        value: clientPubUrl ? `${clientPubUrl.slice(0, 40)}…` : "",
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        present: Boolean(clientAnon),
        value: clientAnon
          ? `${clientAnon.slice(0, 12)}…(${clientAnon.length})`
          : "",
      },
    };
  }, [clientPubUrl, clientAnon]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/_debug/env", { cache: "no-store" });
        const json = (await res
          .json()
          .catch(() => null)) as ServerEnvResp | null;
        if (!res.ok || !json) {
          setServerEnvErr(`Failed to load /api/_debug/env (${res.status})`);
          setServerEnv(null);
          return;
        }
        setServerEnv(json);
        setServerEnvErr(null);
      } catch (e) {
        setServerEnvErr(
          e instanceof Error ? e.message : "Failed to load /api/_debug/env",
        );
        setServerEnv(null);
      }
    })();
  }, []);

  // Directly probe Supabase REST to prove network + env correctness (no Supabase client involved)
  useEffect(() => {
    (async () => {
      if (!clientPubUrl || !clientAnon) {
        setProbe({
          ok: false,
          note: "Client NEXT_PUBLIC env missing => cannot probe Supabase.",
        });
        return;
      }

      // Minimal endpoint that should respond even if RLS blocks data (we only care that we can reach Supabase)
      const url = `${clientPubUrl.replace(/\/$/, "")}/rest/v1/?select=*`;

      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            apikey: clientAnon,
            Authorization: `Bearer ${clientAnon}`,
          },
        });

        setProbe({
          ok:
            res.ok ||
            res.status === 400 ||
            res.status === 401 ||
            res.status === 404,
          status: res.status,
          note: "If status is 200/401/404/etc, the browser is reaching Supabase. If it’s 0/failed, it’s env/CSP/network.",
        });
      } catch (e) {
        setProbe({
          ok: false,
          note:
            e instanceof Error ? e.message : "Fetch failed (network/CSP/env).",
        });
      }
    })();
  }, [clientPubUrl, clientAnon]);

  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">
          Debug: Env + Supabase Reachability
        </h1>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold mb-2">
            Client bundle (compile-time)
          </h2>
          <pre className="text-xs whitespace-pre-wrap break-words bg-black/30 p-3 rounded-lg border border-white/10">
            {JSON.stringify(clientSummary, null, 2)}
          </pre>
          <p className="text-xs text-slate-300 mt-2">
            If either value shows{" "}
            <span className="font-mono">present: false</span>, Vercel did not
            bake the env into the production bundle (wrong env scope, wrong
            project, stale deploy, or cached build).
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold mb-2">
            Server runtime (/api/_debug/env)
          </h2>
          {serverEnvErr ? (
            <div className="text-sm text-red-200">{serverEnvErr}</div>
          ) : (
            <pre className="text-xs whitespace-pre-wrap break-words bg-black/30 p-3 rounded-lg border border-white/10">
              {serverEnv ? JSON.stringify(serverEnv, null, 2) : "Loading..."}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold mb-2">
            Direct Supabase probe (browser fetch)
          </h2>
          <pre className="text-xs whitespace-pre-wrap break-words bg-black/30 p-3 rounded-lg border border-white/10">
            {probe ? JSON.stringify(probe, null, 2) : "Probing..."}
          </pre>
        </section>

        <p className="text-xs text-slate-400">
          Remove this debug page + route after we confirm what Vercel is
          actually doing.
        </p>
      </div>
    </main>
  );
}
