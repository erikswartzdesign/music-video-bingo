import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPlaylistKey } from "@/lib/host/playlists";

type UpsertBody = {
  venueSlug?: string;
  eventCode?: string;
  playlistKey?: string;
  displayMode?: "title" | "artist";
};

type DeleteBody = {
  venueSlug?: string;
  eventCode?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function getEventIdForVenueEventCode(
  supabase: ReturnType<typeof createAdminClient>,
  venueSlug: string,
  eventCode: string
) {
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", venueSlug)
    .maybeSingle();

  if (vErr) return { ok: false as const, error: `Venue lookup failed: ${vErr.message}` };
  if (!venue?.id) return { ok: false as const, error: "Venue not found.", status: 404 as const };

  const { data: evt, error: eErr } = await supabase
    .from("events")
    .select("id")
    .eq("venue_id", venue.id)
    .eq("event_code", eventCode)
    .maybeSingle();

  if (eErr) return { ok: false as const, error: `Event lookup failed: ${eErr.message}` };
  if (!evt?.id) return { ok: false as const, error: "Event not found for this venue.", status: 404 as const };

  return { ok: true as const, eventId: evt.id as string };
}

/**
 * GET /api/host/events/bonus?venueSlug=...&eventCode=...
 * Returns: { ok:true, bonus:{playlist_key,display_mode} | null }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const venueSlug = (url.searchParams.get("venueSlug") ?? "").trim();
  const eventCode = (url.searchParams.get("eventCode") ?? "").trim();

  if (!venueSlug) return jsonError("Missing venueSlug.");
  if (!eventCode) return jsonError("Missing eventCode.");

  const supabase = createAdminClient();

  const idRes = await getEventIdForVenueEventCode(supabase, venueSlug, eventCode);
  if (!idRes.ok) return jsonError(idRes.error, (idRes as any).status ?? 500);

  const { data, error } = await supabase
    .from("event_bonus_games")
    .select("playlist_key, display_mode")
    .eq("event_id", idRes.eventId)
    .maybeSingle();

  if (error) return jsonError(`Bonus lookup failed: ${error.message}`, 500);

  return NextResponse.json({
    ok: true,
    bonus: data
      ? {
          playlist_key: String((data as any).playlist_key),
          display_mode: ((data as any).display_mode ?? "title") as "title" | "artist",
        }
      : null,
  });
}

/**
 * PATCH /api/host/events/bonus
 * Body: { venueSlug, eventCode, playlistKey, displayMode }
 * Upserts bonus config for that event.
 */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as UpsertBody | null;
  if (!body) return jsonError("Invalid JSON body.");

  const venueSlug = (body.venueSlug ?? "").trim();
  const eventCode = (body.eventCode ?? "").trim();
  const playlistKey = String(body.playlistKey ?? "").trim();
  const displayMode = (body.displayMode ?? "title") as "title" | "artist";

  if (!venueSlug) return jsonError("Missing venueSlug.");
  if (!eventCode) return jsonError("Missing eventCode.");

  if (!playlistKey) return jsonError("Missing playlistKey.");
  if (!isValidPlaylistKey(playlistKey)) {
    return jsonError(`Invalid playlistKey "${playlistKey}". Use p1–p20.`, 400);
  }

  if (displayMode !== "title" && displayMode !== "artist") {
    return jsonError("Invalid displayMode. Use 'title' or 'artist'.", 400);
  }

  const supabase = createAdminClient();

  const idRes = await getEventIdForVenueEventCode(supabase, venueSlug, eventCode);
  if (!idRes.ok) return jsonError(idRes.error, (idRes as any).status ?? 500);

  const { data, error } = await supabase
    .from("event_bonus_games")
    .upsert(
      {
        event_id: idRes.eventId,
        playlist_key: playlistKey,
        display_mode: displayMode,
      },
      { onConflict: "event_id" }
    )
    .select("playlist_key, display_mode")
    .maybeSingle();

  if (error) return jsonError(`Failed to save bonus game: ${error.message}`, 500);

  return NextResponse.json({
    ok: true,
    bonus: data
      ? {
          playlist_key: String((data as any).playlist_key),
          display_mode: ((data as any).display_mode ?? "title") as "title" | "artist",
        }
      : null,
  });
}

/**
 * DELETE /api/host/events/bonus
 * Body: { venueSlug, eventCode }
 * Removes bonus config for that event.
 */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as DeleteBody | null;
  if (!body) return jsonError("Invalid JSON body.");

  const venueSlug = (body.venueSlug ?? "").trim();
  const eventCode = (body.eventCode ?? "").trim();

  if (!venueSlug) return jsonError("Missing venueSlug.");
  if (!eventCode) return jsonError("Missing eventCode.");

  const supabase = createAdminClient();

  const idRes = await getEventIdForVenueEventCode(supabase, venueSlug, eventCode);
  if (!idRes.ok) return jsonError(idRes.error, (idRes as any).status ?? 500);

  const { error } = await supabase
    .from("event_bonus_games")
    .delete()
    .eq("event_id", idRes.eventId);

  if (error) return jsonError(`Failed to remove bonus game: ${error.message}`, 500);

  return NextResponse.json({ ok: true });
}
