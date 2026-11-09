export const SEARCH_TYPES = ["movies", "tv", "people"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const DISCOVER_SORTS = ["popularity", "release", "rating"] as const;
export type DiscoverSort = (typeof DISCOVER_SORTS)[number];

export const SORT_LABELS: Record<DiscoverSort, string> = {
  popularity: "Most popular",
  release: "Newest first",
  rating: "Highest TMDB rating",
};

export const MIN_RATING_OPTIONS = [5, 6, 7, 8] as const;

export const MIN_YEAR = 1888; // the first film

export const maxYear = () => new Date().getFullYear() + 5; // allow upcoming releases

/** "alien 1979" -> { title: "alien", year: 1979 }. Needs text before the year. */
export function splitTrailingYear(q: string) {
  const m = /^(.*\S)\s+((?:18|19|20)\d{2})$/.exec(q);
  if (!m) return null;
  const year = Number(m[2]);
  if (year < MIN_YEAR || year > maxYear()) return null;
  return { title: m[1].trim(), year };
}
