import type { MediaType } from "./media";

export type MovieSummary = {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null; // "YYYY-MM-DD" (first air date for series)
};

export type SearchResult = {
  results: MovieSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
};

export type MovieDetails = MovieSummary & {
  originalTitle: string;
  overview: string | null;
  tagline: string | null;
  backdropPath: string | null;
  runtimeMinutes: number | null; // always null for series: they have no single runtime
  genres: { id: number; name: string }[];
  voteAverage: number | null; // TMDB community rating, not the user's
  voteCount: number;
  directors: { id: number; name: string }[];
  cast: { id: number; name: string; character: string | null }[];
  // Series only. Optional so older cached movie data still type-checks.
  episodeRuntimeMinutes?: number | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  creators?: { id: number; name: string }[];
};

export type PersonSummary = {
  id: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
  knownFor: string[];
};

export type PersonSearchResult = {
  results: PersonSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
};

export type PersonDetails = {
  id: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
  biography: string | null;
  birthday: string | null;
  placeOfBirth: string | null;
  acted: MovieSummary[];
  directed: MovieSummary[];
};
