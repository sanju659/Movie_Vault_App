const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type ImageSize = "w185" | "w342" | "w500" | "w780" | "w1280" | "h632";

export function imageUrl(path: string | null | undefined, size: ImageSize) {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function releaseYear(date: string | null | undefined) {
  return date && date.length >= 4 ? date.slice(0, 4) : null;
}

export function formatRuntime(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
