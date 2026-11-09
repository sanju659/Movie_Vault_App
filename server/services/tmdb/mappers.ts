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
    mediaType: "movie",
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
  tv_credits?: {
    cast?: RawTv[];
    crew?: (RawTv & { job?: string })[];
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

// Drops adult titles and duplicate credits for the same title
function dedupe<T extends { id: number; adult?: boolean }>(list: T[]): T[] {
  const seen = new Set<number>();
  return list.filter((m) => !m.adult && !seen.has(m.id) && seen.add(m.id));
}
const byPopularity = (a: { popularity?: number }, b: { popularity?: number }) =>
  (b.popularity ?? 0) - (a.popularity ?? 0);
const byNewest = (a: RawMovie, b: RawMovie) =>
  (b.release_date || "").localeCompare(a.release_date || ""); // undated last
const byNewestTv = (a: RawTv, b: RawTv) =>
  (b.first_air_date || "").localeCompare(a.first_air_date || "");

export function mapPersonDetails(r: RawPersonDetails): PersonDetails {
  const acted = dedupe(r.movie_credits?.cast ?? [])
    .sort(byPopularity) // best-known roles first
    .map(mapSummary);
  const directed = dedupe(
    (r.movie_credits?.crew ?? []).filter((c) => c.job === "Director"),
  )
    .sort(byNewest)
    .map(mapSummary);

  const actedTv = dedupe(r.tv_credits?.cast ?? [])
    .sort(byPopularity)
    .map((t) => mapTvSummary(t));
  // TMDB lists series creators as crew with the job "Creator"
  const created = dedupe(
    (r.tv_credits?.crew ?? []).filter((c) => c.job === "Creator"),
  )
    .sort(byNewestTv)
    .map((t) => mapTvSummary(t));

  return {
    id: r.id,
    name: r.name || "Unknown",
    profilePath: r.profile_path ?? null,
    knownForDepartment: r.known_for_department || null,
    biography: r.biography?.trim() || null,
    birthday: r.birthday || null,
    placeOfBirth: r.place_of_birth || null,
    acted,
    directed,
    actedTv,
    created,
  };
}

// ---------- TV ----------

type RawTv = {
  id: number;
  name?: string;
  poster_path?: string | null;
  first_air_date?: string | null;
  adult?: boolean;
  popularity?: number;
};

export type RawTvList = {
  results?: RawTv[];
  page?: number;
  total_pages?: number;
  total_results?: number;
};

export type RawTvDetails = RawTv & {
  original_name?: string;
  overview?: string | null;
  tagline?: string | null;
  backdrop_path?: string | null;
  episode_run_time?: number[];
  genres?: { id: number; name: string }[];
  vote_average?: number;
  vote_count?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  created_by?: { id: number; name: string }[];
  aggregate_credits?: {
    cast?: {
      id: number;
      name: string;
      order?: number;
      roles?: { character?: string | null }[];
    }[];
  };
};

// Takes one argument on purpose, so it is safe to pass straight to .map()
export function mapTvSummary(r: RawTv): MovieSummary {
  return {
    mediaType: "tv",
    tmdbId: r.id,
    title: r.name || "Untitled",
    posterPath: r.poster_path ?? null,
    releaseDate: r.first_air_date || null,
  };
}

export function mapTvDetails(r: RawTvDetails): MovieDetails {
  const cast = [...(r.aggregate_credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 15)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.roles?.[0]?.character || null,
    }));

  const episodeRuntime = (r.episode_run_time ?? []).find((m) => m > 0) ?? null;
  const voteCount = r.vote_count ?? 0;

  return {
    ...mapTvSummary(r),
    originalTitle: r.original_name || r.name || "Untitled",
    overview: r.overview || null,
    tagline: r.tagline || null,
    backdropPath: r.backdrop_path ?? null,
    runtimeMinutes: null, // a series has no single runtime
    episodeRuntimeMinutes: episodeRuntime,
    genres: r.genres ?? [],
    voteAverage: voteCount > 0 && r.vote_average ? r.vote_average : null,
    voteCount,
    directors: [],
    creators: (r.created_by ?? []).map((c) => ({ id: c.id, name: c.name })),
    numberOfSeasons: r.number_of_seasons ?? null,
    numberOfEpisodes: r.number_of_episodes ?? null,
    cast,
  };
}
