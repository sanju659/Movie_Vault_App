import type { MovieDetails, MovieSummary } from "@/lib/movie-types";

type RawMovie = {
  id: number;
  title?: string;
  poster_path?: string | null;
  release_date?: string | null;
};

export type RawDetails = RawMovie & {
  original_title?: string;
  overview?: string | null;
  tagline?: string | null;
  backdrop_path?: string | null;
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  vote_count?: number;
  credits?: {
    cast?: {
      id: number;
      name: string;
      character?: string | null;
      order?: number;
    }[];
    crew?: { id: number; name: string; job?: string }[];
  };
};

export type RawList = {
  results?: RawMovie[];
  page?: number;
  total_pages?: number;
  total_results?: number;
};

export function mapSummary(r: RawMovie): MovieSummary {
  return {
    tmdbId: r.id,
    title: r.title || "Untitled",
    posterPath: r.poster_path ?? null,
    releaseDate: r.release_date || null, // "" becomes null
  };
}

export function mapDetails(r: RawDetails): MovieDetails {
  const cast = [...(r.credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 15)
    .map((c) => ({ id: c.id, name: c.name, character: c.character || null }));

  const seen = new Set<number>();
  const directors = (r.credits?.crew ?? [])
    .filter((c) => c.job === "Director" && !seen.has(c.id) && seen.add(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

  const voteCount = r.vote_count ?? 0;
  return {
    ...mapSummary(r),
    originalTitle: r.original_title || r.title || "Untitled",
    overview: r.overview || null,
    tagline: r.tagline || null,
    backdropPath: r.backdrop_path ?? null,
    runtimeMinutes: r.runtime && r.runtime > 0 ? r.runtime : null,
    genres: r.genres ?? [],
    voteAverage: voteCount > 0 && r.vote_average ? r.vote_average : null,
    voteCount,
    directors,
    cast,
  };
}
