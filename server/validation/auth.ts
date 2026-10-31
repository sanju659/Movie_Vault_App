import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

const timezone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, "Invalid timezone");

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(50),
  email,
  password: z.string().min(10, "Use at least 10 characters").max(128),
  timezone: timezone.default("UTC"),
  acceptedTerms: z.literal(true, { error: "You must accept the terms" }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
});
