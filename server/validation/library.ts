import { z } from "zod";
import { LIBRARY_SORTS, LIBRARY_STATUSES } from "@/lib/library-types";
import { GENRE_NAMES } from "@/lib/genres";
import { MEDIA_TYPES } from "@/lib/media";

export const tmdbIdSchema = z.coerce.number().int().positive().max(999_999_999);

export const statusSchema = z.enum(LIBRARY_STATUSES);

// null clears the rating
export const ratingSchema = z.number().int().min(1).max(10).nullable();

// 'unrated', or a minimum number of stars (1-5) meaning "N stars & up"
export const RATING_FILTERS = ["unrated", "1", "2", "3", "4", "5"] as const;

export const mediaTypeSchema = z.enum(MEDIA_TYPES);

// Forgiving on purpose: a bad value in the URL falls back to a default
// instead of throwing, so hand-edited links never crash the page.
export const listQuerySchema = z.object({
  status: z.enum(LIBRARY_STATUSES).optional().catch(undefined),
  sort: z.enum(LIBRARY_SORTS).catch("added"),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
  genre: z.coerce
    .number()
    .int()
    .refine((id) => id in GENRE_NAMES)
    .optional()
    .catch(undefined),
  year: z.coerce.number().int().min(1888).max(2100).optional().catch(undefined),
  rating: z.enum(RATING_FILTERS).optional().catch(undefined),
  media: z.enum(MEDIA_TYPES).optional().catch(undefined),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
