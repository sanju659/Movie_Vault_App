import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  TMDB_READ_ACCESS_TOKEN: z
    .string()
    .min(1, "TMDB_READ_ACCESS_TOKEN is required"),
  TMDB_BASE_URL: z.string().url().default("https://api.themoviedb.org/3"),
  TMDB_IMAGE_BASE_URL: z.string().url().default("https://image.tmdb.org/t/p"),
  TMDB_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  TMDB_DETAILS_TTL_DAYS: z.coerce.number().int().positive().default(7),
  LIBRARY_SNAPSHOT_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_COOKIE_NAME: z.string().default("wv_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),
  THROTTLE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

// Validated on first use (not at import time), so `next build` doesn't fail
// when env vars are only available at runtime.
export function getEnv(): Env {
  if (!cached) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const problems = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`Invalid environment variables:\n${problems}`);
    }
    cached = result.data;
  }
  return cached;
}
