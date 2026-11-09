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

export type PersonSummary = {
  id: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null; // "Acting", "Directing", ...
  knownFor: string[]; // up to 3 titles
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
  birthday: string | null; // "YYYY-MM-DD"
  placeOfBirth: string | null;
  acted: MovieSummary[];
  directed: MovieSummary[];
};
