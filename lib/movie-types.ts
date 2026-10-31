export type MovieSummary = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null; // "YYYY-MM-DD"
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
  runtimeMinutes: number | null;
  genres: { id: number; name: string }[];
  voteAverage: number | null; // TMDB community rating, not the user's
  voteCount: number;
  directors: { id: number; name: string }[];
  cast: { id: number; name: string; character: string | null }[];
};
