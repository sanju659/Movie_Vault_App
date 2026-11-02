import { z } from "zod";
import { isValidCalendarDate } from "@/lib/dates";

export const watchedOnSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine(isValidCalendarDate, "Enter a valid date.")
  .refine((s) => s >= "1888-01-01", "Enter a valid date."); // the first film was made in 1888

// Empty notes become null
export const notesSchema = z
  .string()
  .trim()
  .max(500, "Notes can be at most 500 characters.")
  .nullish()
  .transform((v) => v || null);

export const eventInputSchema = z.object({
  watchedOn: watchedOnSchema,
  notes: notesSchema,
});

export const eventIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
