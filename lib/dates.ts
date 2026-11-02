// A viewing date is a calendar date string "YYYY-MM-DD" in the user's own timezone.
// It is never converted to a Date instant, so a late-night viewing can't slip into the wrong day.

export function isValidCalendarDate(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

/** Today's calendar date in the given IANA timezone. */
export function todayIn(timeZone: string) {
  const format = (tz: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)!.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  };
  try {
    return format(timeZone);
  } catch {
    return format("UTC"); // invalid timezone string: fall back safely
  }
}

// Fixed locale + UTC so server and browser render identical text (no hydration mismatch)
export function formatWatchedOn(s: string) {
  return new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "2026-03" -> "March 2026" */
export function formatMonth(key: string) {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  });
}
