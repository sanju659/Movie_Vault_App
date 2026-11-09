import type { MediaType } from "./media";

export const LIBRARY_STATUSES = ["watchlist", "watching", "watched"] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export const LIBRARY_SORTS = ["added", "title", "release", "rating"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

// Plain, serializable shape that is safe to pass to client components
export type LibraryItemView = {
  mediaType: MediaType;
  tmdbId: number;
  status: LibraryStatus;
  personalRating: number | null; // integer 1-10, or null if unrated
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  genreIds: number[];
  addedAt: string; // ISO
  updatedAt: string; // ISO
};

export type LibraryList = {
  items: LibraryItemView[];
  page: number;
  totalPages: number;
  total: number;
};

export type LibraryCounts = Record<LibraryStatus, number> & {
  total: number;
  media: Record<MediaType, number>;
};
