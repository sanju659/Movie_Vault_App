import { z } from "zod";
import { LIBRARY_SORTS, LIBRARY_STATUSES } from "@/lib/library-types";

export const tmdbIdSchema = z.coerce.number().int().positive().max(999_999_999);

export const statusSchema = z.enum(LIBRARY_STATUSES);

// null clears the rating
export const ratingSchema = z.number().int().min(1).max(10).nullable();

// Forgiving on purpose: a bad value in the URL falls back to a default
// instead of throwing, so hand-edited links never crash the page.
export const listQuerySchema = z.object({
  status: z.enum(LIBRARY_STATUSES).optional().catch(undefined),
  sort: z.enum(LIBRARY_SORTS).catch("added"),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
