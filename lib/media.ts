export const MEDIA_TYPES = ["movie", "tv"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const mediaPath = (type: MediaType, tmdbId: number) =>
  `/${type}/${tmdbId}`;

export const MEDIA_NOUN: Record<MediaType, string> = {
  movie: "movie",
  tv: "series",
};

// Series-level tracking: a "viewing" of a series means you finished the whole series
export const WATCHED_QUESTION: Record<MediaType, string> = {
  movie: "When did you watch it?",
  tv: "When did you finish it?",
};
