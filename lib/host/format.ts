// lib/host/format.ts

export function slugToTitle(slug: string) {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Friendly date/time display.
 * NOTE: still Denver-focused for now. We'll make this venue-driven later.
 */
export function formatStartAt(startAtIso: string | null | undefined) {
  if (!startAtIso) return "(unknown)";
  const d = new Date(startAtIso);
  if (Number.isNaN(d.getTime())) return "(unknown)";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
