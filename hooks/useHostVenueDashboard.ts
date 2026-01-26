"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import { slugToTitle, todayISO } from "@/lib/host/format";
import { defaultGames } from "@/lib/host/games";
import { PLAYLIST_OPTIONS } from "@/lib/host/playlists";

import type {
  DbEventGameRow,
  DbPatternRow,
  EventRow,
  HostGameForm,
  VenueRow,
} from "@/lib/host/types";

type DbBonusRow = {
  event_id: string;
  playlist_key: string;
  display_mode: "title" | "artist" | null;
};

export function useHostVenueDashboard(venueSlug: string) {
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Create event form
  const [eventDate, setEventDate] = useState<string>(todayISO());
  const [configKey, setConfigKey] = useState<string>(
    process.env.NEXT_PUBLIC_DEFAULT_CONFIG_KEY || "dec-22-2025",
  );
  const [eventName, setEventName] = useState<string>("");

  // DB-driven game setup (1–5)
  const [games, setGames] = useState<HostGameForm[]>(defaultGames());

  // Bonus form ("" = none)
  const [bonusPlaylistKey, setBonusPlaylistKey] = useState<string>("");
  const [bonusDisplayMode, setBonusDisplayMode] = useState<"title" | "artist">(
    "title",
  );

  // DB patterns for dropdown
  const [patterns, setPatterns] = useState<DbPatternRow[]>([]);

  // Event games: event_code -> rows (includes 1–6 when present)
  const [eventGamesByCode, setEventGamesByCode] = useState<
    Record<string, DbEventGameRow[]>
  >({});

  // Bonus config: event_code -> derived from event_games row where game_number = 6
  const [eventBonusByCode, setEventBonusByCode] = useState<
    Record<string, DbBonusRow | null>
  >({});

  // Expand/collapse config view per event
  const [expandedByCode, setExpandedByCode] = useState<Record<string, boolean>>(
    {},
  );

  // For absolute copy URLs
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const venueNameDisplay = useMemo(() => {
    const fromDb = venue?.name?.trim();
    return fromDb || slugToTitle(venueSlug) || venueSlug || "Unknown Venue";
  }, [venue?.name, venueSlug]);

  const patternsById = useMemo(() => {
    const map: Record<number, string> = {};
    for (const p of patterns) map[p.id] = p.name;
    return map;
  }, [patterns]);

  function updateGame(
    gameNumber: HostGameForm["gameNumber"],
    patch: Partial<HostGameForm>,
  ) {
    setGames((prev) =>
      prev.map((g) => (g.gameNumber === gameNumber ? { ...g, ...patch } : g)),
    );
  }

  function absoluteUrl(path: string) {
    if (!path.startsWith("/")) path = `/${path}`;
    return origin ? `${origin}${path}` : path;
  }

  async function copyToClipboard(text: string, keyForFeedback: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      setCopiedKey(keyForFeedback);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(
        () => setCopiedKey(null),
        1500,
      );
    } catch {
      setErrMsg("Copy failed (browser blocked clipboard).");
    }
  }

  function toggleExpanded(eventCode: string) {
    setExpandedByCode((prev) => ({ ...prev, [eventCode]: !prev[eventCode] }));
  }

  function loadConfigurationIntoForm(eventCode: string) {
    const rows = eventGamesByCode[eventCode];
    if (!rows || rows.length === 0) {
      setErrMsg("That event has no DB game configuration to load.");
      return;
    }

    const base = defaultGames();
    const byNum = new Map<number, DbEventGameRow>();
    for (const r of rows) byNum.set(Number(r.game_number), r);

    const next: HostGameForm[] = base.map((g) => {
      const row = byNum.get(g.gameNumber);
      if (!row) return g;

      const playlistKey =
        String(row.playlist_key ?? g.playlistKey).trim() || g.playlistKey;
      const displayMode = (row.display_mode ?? g.displayMode) as any;
      const patternId =
        g.gameNumber === 1
          ? null
          : row.pattern_id === undefined
            ? g.patternId
            : row.pattern_id;

      return { ...g, playlistKey, displayMode, patternId };
    });

    setGames(next);

    // ALSO load bonus (if present) — derived from event_games game_number = 6
    const b = eventBonusByCode[eventCode] ?? null;
    setBonusPlaylistKey(b?.playlist_key ? String(b.playlist_key) : "");
    setBonusDisplayMode((b?.display_mode ?? "title") as "title" | "artist");

    setErrMsg(null);
  }

  async function refresh() {
    if (!venueSlug) return;
    setLoading(true);
    setErrMsg(null);

    try {
      const res = await fetch(
        `/api/host/venue-dashboard?venueSlug=${encodeURIComponent(venueSlug)}`,
        { cache: "no-store" },
      );

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setVenue(null);
        setEvents([]);
        setEventGamesByCode({});
        setEventBonusByCode({});
        setErrMsg("Could not load venue/events.");
        setLoading(false);
        return;
      }

      const v = json.venue as VenueRow;
      const list = (json.events ?? []) as EventRow[];
      const gameRows = (json.eventGames ?? []) as any[];

      setVenue(v);
      setEvents(list);

      // Build eventGamesByCode + eventBonusByCode from returned eventGames
      const byEventId: Record<string, DbEventGameRow[]> = {};
      for (const r of gameRows) {
        const event_id = String(r.event_id);
        if (!byEventId[event_id]) byEventId[event_id] = [];
        byEventId[event_id].push({
          event_id,
          game_number: Number(r.game_number),
          playlist_key: String(r.playlist_key),
          display_mode: (r.display_mode ?? null) as any,
          pattern_id: r.pattern_id ?? null,
        });
      }

      const byCode: Record<string, DbEventGameRow[]> = {};
      const byCodeBonus: Record<string, DbBonusRow | null> = {};

      for (const e of list) {
        const rowsForEvent = byEventId[e.id] ?? [];
        if (rowsForEvent.length) byCode[e.event_code] = rowsForEvent;

        const bonusRow = rowsForEvent.find((r) => Number(r.game_number) === 6);
        byCodeBonus[e.event_code] = bonusRow
          ? {
              event_id: e.id,
              playlist_key: String(bonusRow.playlist_key ?? ""),
              display_mode: (bonusRow.display_mode ?? null) as any,
            }
          : null;
      }

      setEventGamesByCode(byCode);
      setEventBonusByCode(byCodeBonus);

      setLoading(false);
    } catch {
      setVenue(null);
      setEvents([]);
      setEventGamesByCode({});
      setEventBonusByCode({});
      setErrMsg("Could not load venue/events.");
      setLoading(false);
    }
  }

  // Load patterns once (public read)
  useEffect(() => {
    let cancelled = false;

    async function loadPatterns() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("patterns")
          .select("id,name")
          .order("id", { ascending: true });

        if (cancelled) return;
        if (error || !data) return;

        const list: DbPatternRow[] = (data as any[]).map((r) => ({
          id: Number(r.id),
          name: String(r.name ?? `Pattern ${r.id}`),
        }));

        setPatterns(list.filter((p) => Number.isInteger(p.id)));
      } catch {
        // non-fatal
      }
    }

    loadPatterns();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueSlug]);

  const activeEvent = useMemo(
    () => events.find((e) => e.status === "active") ?? null,
    [events],
  );
  const scheduledEvents = useMemo(
    () => events.filter((e) => e.status === "scheduled"),
    [events],
  );
  const completedEvents = useMemo(
    () => events.filter((e) => e.status === "completed"),
    [events],
  );

  const activeEventDisplayName =
    activeEvent?.name?.trim() ||
    (activeEvent ? `${venueNameDisplay} — ${activeEvent.event_code}` : "");

  const activePlayerWelcomeUrl = activeEvent
    ? absoluteUrl(`/v/${venueSlug}`)
    : "";
  const activeHowToPlayUrl = activeEvent
    ? absoluteUrl(`/how-to-play?venue=${encodeURIComponent(venueSlug)}`)
    : "";
  const activeEventUrl = activeEvent
    ? absoluteUrl(`/event/${encodeURIComponent(activeEvent.event_code)}`)
    : "";

  async function createAndActivate() {
    if (!venueSlug) return;

    setErrMsg(null);

    const missing = games.find((g) => !String(g.playlistKey || "").trim());
    if (missing) {
      setErrMsg(`Game ${missing.gameNumber} is missing a playlist selection.`);
      return;
    }

    // Bonus -> game 6 (optional)
    const bonusKey = String(bonusPlaylistKey || "").trim();
    const bonusRow = bonusKey
      ? [
          {
            gameNumber: 6,
            playlistKey: bonusKey,
            displayMode: bonusDisplayMode,
            patternId: null,
          },
        ]
      : [];

    try {
      const res = await fetch("/api/host/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueSlug,
          eventDate,
          configKey: configKey.trim() ? configKey.trim() : null,
          name: eventName.trim() ? eventName.trim() : null,
          makeActive: true,
          games: [
            ...games.map((g) => ({
              gameNumber: g.gameNumber,
              playlistKey: g.playlistKey,
              displayMode: g.displayMode,
              patternId: g.patternId,
            })),
            ...bonusRow,
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrMsg(json?.error ?? "Failed to create/activate event.");
        return;
      }

      setEventName("");
      await refresh();
    } catch {
      setErrMsg("Failed to create/activate event.");
    }
  }

  async function deactivateAll() {
    setErrMsg(null);

    try {
      const res = await fetch("/api/host/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueSlug }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrMsg(json?.error ?? "Failed to deactivate.");
        return;
      }

      await refresh();
    } catch {
      setErrMsg("Failed to deactivate.");
    }
  }

  return {
    // state
    loading,
    errMsg,
    venue,
    events,

    // derived
    venueNameDisplay,
    patterns,
    patternsById,
    activeEvent,
    scheduledEvents,
    completedEvents,

    // form state
    eventDate,
    setEventDate,
    configKey,
    setConfigKey,
    eventName,
    setEventName,
    games,
    setGames,
    updateGame,

    // BONUS form state
    bonusPlaylistKey,
    setBonusPlaylistKey,
    bonusDisplayMode,
    setBonusDisplayMode,

    // event config display
    eventGamesByCode,
    eventBonusByCode,
    expandedByCode,
    toggleExpanded,
    loadConfigurationIntoForm,

    // actions
    refresh,
    createAndActivate,
    deactivateAll,

    // copy
    copiedKey,
    copyToClipboard,
    activeEventDisplayName,
    activePlayerWelcomeUrl,
    activeHowToPlayUrl,
    activeEventUrl,

    // constants
    playlistOptions: PLAYLIST_OPTIONS,
  };
}
