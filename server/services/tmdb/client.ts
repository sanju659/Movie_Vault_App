import "server-only";
import { getEnv } from "@/server/env";

export class TmdbError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryable = false,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

type Params = Record<string, string | number | boolean | undefined>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function tmdbFetch<T>(
  path: string,
  params: Params = {},
  options: { revalidate?: number } = {},
): Promise<T> {
  const env = getEnv();
  const url = new URL(env.TMDB_BASE_URL + path);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(env.TMDB_REQUEST_TIMEOUT_MS),
        ...(options.revalidate
          ? { next: { revalidate: options.revalidate } }
          : {}),
      });

      if (res.status === 404) {
        throw new TmdbError(404, "Not found");
      }

      if (res.status === 429 || res.status >= 500) {
        throw new TmdbError(502, `TMDB responded ${res.status}`, true);
      }

      if (!res.ok) {
        throw new TmdbError(502, `TMDB responded ${res.status}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof TmdbError && !err.retryable) {
        throw err;
      }

      lastError = err;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(300 * 2 ** attempt);
    }
  }

  console.error("TMDB request failed:", path, lastError);
  throw new TmdbError(502, "TMDB is unavailable");
}
