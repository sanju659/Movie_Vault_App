import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { connectDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { RateLimit } from "@/server/models/RateLimit";
import { AppError, isDuplicateKeyError } from "@/server/errors";

// Behind a trusted proxy (Vercel and similar) the first x-forwarded-for entry is the client.
// If you ever self-host without a proxy, this header can be spoofed.
// Locally there is no header, so everything shares the "unknown" bucket.
export function clientIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  return (
    fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
  );
}

/**
 * Fixed-window counter. Throws a 429 once `limit` calls happened in the current window.
 * Keys are hashed, so no raw IPs or emails are stored.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds = getEnv().THROTTLE_WINDOW_SECONDS,
) {
  await connectDb();
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const _id = createHash("sha256")
    .update(`${key}|${windowSeconds}|${windowStart}`)
    .digest("hex");
  const update = {
    $inc: { count: 1 },
    $setOnInsert: { expiresAt: new Date(windowStart + windowMs + 60_000) },
  };

  let doc;
  try {
    doc = await RateLimit.findOneAndUpdate({ _id }, update, {
      upsert: true,
      new: true,
    });
  } catch (err) {
    // Two first requests raced to create the counter: the second one just increments
    if (!isDuplicateKeyError(err)) throw err;
    doc = await RateLimit.findOneAndUpdate({ _id }, update, { new: true });
  }

  if (doc && doc.count > limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((windowStart + windowMs - Date.now()) / 1000),
    );
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Too many attempts. Please wait a moment and try again.",
      undefined,
      retryAfter,
    );
  }
}
