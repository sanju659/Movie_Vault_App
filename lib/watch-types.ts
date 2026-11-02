export type ViewingEventView = {
  id: string;
  tmdbId: number;
  watchedOn: string; // "YYYY-MM-DD"
  notes: string | null;
  isRewatch: boolean; // derived, never stored
};

export type HistoryEntry = ViewingEventView & {
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
};

export type HistoryList = {
  entries: HistoryEntry[];
  page: number;
  totalPages: number;
  total: number;
};
