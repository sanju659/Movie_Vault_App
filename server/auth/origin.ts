import "server-only";
import type { NextRequest } from "next/server";
import { AppError } from "@/server/errors";

export async function readJson(req: NextRequest) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    throw new AppError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json.",
    );
  }
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body is not valid JSON.");
  }
}

// Reject cross-site state-changing requests. Browsers always send Origin on these.
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) {
    throw new AppError(403, "BAD_ORIGIN", "Cross-origin request blocked.");
  }
}
