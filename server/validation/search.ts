import { z } from "zod";
import { GENRE_NAMES } from "@/lib/genres";
import { LANGUAGES } from "@/lib/languages";
import { DISCOVER_SORTS, MIN_YEAR, SEARCH_TYPES, maxYear } from "@/lib/search";

// Forgiving on purpose: a bad value in the URL falls back to "no filter"
// instead of throwing, so hand-edited links never crash the page.
export function parseSearchQuery(
  raw: Record<string, string | string[] | undefined>,
) {
  const schema = z.object({
    type: z.enum(SEARCH_TYPES).catch("movies"),
    q: z
      .string()
      .trim()
      .max(100)
      .optional()
      .catch(undefined)
      .transform((v) => v || undefined),
    year: z.coerce
      .number()
      .int()
      .min(MIN_YEAR)
      .max(maxYear())
      .optional()
      .catch(undefined),
    genre: z.coerce
      .number()
      .int()
      .refine((id) => id in GENRE_NAMES)
      .optional()
      .catch(undefined),
    rating: z.coerce.number().int().min(1).max(9).optional().catch(undefined), // minimum TMDB rating
    lang: z
      .string()
      .refine((c) => LANGUAGES.some((l) => l.code === c))
      .optional()
      .catch(undefined),
    sort: z.enum(DISCOVER_SORTS).catch("popularity"),
    page: z.coerce.number().int().min(1).max(500).catch(1), // TMDB caps pages at 500
  });
  return schema.parse(raw);
}

export type SearchQuery = ReturnType<typeof parseSearchQuery>;
