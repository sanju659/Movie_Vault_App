import type {
  MovieDetails,
  MovieSummary,
  PersonDetails,
  PersonSummary,
} from "@/lib/movie-types";

type RawMovie = {
  id: number;
  title?: string;
  poster_path?: string | null;
  release_date?: string | null;
  adult?: boolean;
  popularity?: number;
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

type RawPerson = {
  id: number;
  name?: string;
  profile_path?: string | null;
  known_for_department?: string | null;
  known_for?: { title?: string; name?: string }[];
};

export type RawPersonList = {
  results?: RawPerson[];
  page?: number;
  total_pages?: number;
  total_results?: number;
};

export type RawPersonDetails = RawPerson & {
  biography?: string | null;
  birthday?: string | null;
  place_of_birth?: string | null;
  movie_credits?: {
    cast?: RawMovie[];
    crew?: (RawMovie & { job?: string })[];
  };
};

export function mapPersonSummary(r: RawPerson): PersonSummary {
  return {
    id: r.id,
    name: r.name || "Unknown",
    profilePath: r.profile_path ?? null,
    knownForDepartment: r.known_for_department || null,
    knownFor: (r.known_for ?? [])
      .map((k) => k.title || k.name)
      .filter((t): t is string => Boolean(t))
      .slice(0, 3),
  };
}

// Drops adult titles and duplicate credits for the same movie
function dedupe<T extends RawMovie>(list: T[]): T[] {
  const seen = new Set<number>();
  return list.filter((m) => !m.adult && !seen.has(m.id) && seen.add(m.id));
}
const byPopularity = (a: RawMovie, b: RawMovie) =>
  (b.popularity ?? 0) - (a.popularity ?? 0);
const byNewest = (a: RawMovie, b: RawMovie) =>
  (b.release_date || "").localeCompare(a.release_date || ""); // undated last

export function mapPersonDetails(r: RawPersonDetails): PersonDetails {
  const acted = dedupe(r.movie_credits?.cast ?? [])
    .sort(byPopularity)
    .map(mapSummary);
  const directed = dedupe((r.movie_credits?.crew ?? []).filter((c) => c.job === 'Director'))
    .sort(byNewest)
    .map(mapSummary);

  return {
    id: r.id,
    name: r.name || 'Unknown',
    profilePath: r.profile_path ?? null,
    knownForDepartment: r.known_for_department || null,
    biography: r.biography?.trim() || null,
    birthday: r.birthday || null,
    placeOfBirth: r.place_of_birth || null,
    acted,
    directed,
  };
}
