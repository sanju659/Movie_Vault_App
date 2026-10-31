import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { handle } from "@/server/errors";

export function GET() {
  return handle(async () => NextResponse.json({ user: await requireUser() }));
}
