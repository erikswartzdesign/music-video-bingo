"use client";

import type { DbEventGameRow, EventRow } from "@/lib/host/types";

type Props = {
  title: string;
  subtitle?: string;
  tip?: string;

  loading: boolean;
  events: EventRow[];

  expandedByCode: Record<string, boolean>;
  onToggleExpanded: (eventCode: string) => void;

  eventGamesByCode: Record<string, DbEventGameRow[]>;
  patternsById: Record<number, string>;

  onLoadConfiguration: (eventCode: string) => void;

  formatStartAt: (iso: string | null | undefined) => string;
};

export default function EventListSection({
  title,
  subtitle,
  tip,
  loading,
  events,
  expandedByCode,
  onToggleExpanded,
  eventGamesByCode,
  patternsById,
  onLoadConfiguration,
  formatStartAt,
}: Props) {
  function renderGameConfigList(rows: DbEventGameRow[] | undefined) {
    if (!rows || rows.length === 0) {
      return <p className="text-xs text-slate-300 mt-2">No DB game configuration found.</p>;
    }

    const sorted = [...rows]
      .filter((r) => Number(r.game_number) >= 1 && Number(r.game_number) <= 5)
      .sort((a, b) => Number(a.game_number) - Number(b.game_number));

    return (
      <div className="mt-3 space-y-2">
        {sorted.map((r) => {
          const gnum = Number(r.game_number);
          const mode = (r.display_mode ?? "title") === "artist" ? "Artist" : "Title";
          const playlist = String(r.playlist_key ?? "");
          const pat =
            gnum === 1
              ? "No pattern"
              : r.pattern_id
              ? patternsById[Number(r.pattern_id)] ?? `Pattern ${r.pattern_id}`
              : "No pattern";

          return (
            <div
              key={`${gnum}-${playlist}-${mode}-${r.pattern_id ?? "none"}`}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-md border border-white/10 bg-black/20 px-3 py-2"
            >
              <div className="text-xs text-slate-200 font-semibold">Game {gnum}</div>
              <div className="text-xs text-slate-300 font-mono">
                {playlist} • {mode}
                {gnum === 1 ? "" : ` • ${pat}`}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
      </div>

      {tip ? <p className="mt-2 text-[11px] text-slate-400">{tip}</p> : null}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-300">Loading…</p>
        ) : events.length ? (
          events.map((evt) => {
            const isExpanded = Boolean(expandedByCode[evt.event_code]);
            const cfgRows = eventGamesByCode[evt.event_code];
            const hasCfg = Boolean(cfgRows && cfgRows.length);

            return (
              <div key={evt.event_code} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{evt.event_code}</p>
                    {evt.name ? <p className="text-xs text-slate-300 mt-1">{evt.name}</p> : null}

                    <p className="text-xs text-slate-300 mt-1">
                      Status: <span className="font-mono">{evt.status}</span>
                    </p>

                    <p className="text-xs text-slate-300 mt-1">
                      Start: <span className="font-mono">{formatStartAt(evt.start_at)}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleExpanded(evt.event_code)}
                      className="px-3 py-2 rounded-md text-sm font-semibold bg-slate-900/40 border border-white/15 hover:bg-slate-900/55 transition"
                    >
                      {isExpanded ? "Hide Config" : "Game Configuration"}
                    </button>

                    <button
                      type="button"
                      onClick={() => onLoadConfiguration(evt.event_code)}
                      disabled={!hasCfg}
                      className={[
                        "px-3 py-2 rounded-md text-sm font-semibold transition",
                        hasCfg
                          ? "bg-emerald-500 text-black hover:bg-emerald-400"
                          : "bg-emerald-500/30 text-black/60 cursor-not-allowed",
                      ].join(" ")}
                    >
                      Load Configuration
                    </button>
                  </div>
                </div>

                {isExpanded ? renderGameConfigList(cfgRows) : null}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-300 mt-2">None.</p>
        )}
      </div>
    </div>
  );
}
