import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/auth/origin";
import { handle } from "@/server/errors";

export function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    await destroySession();
    return NextResponse.json({ ok: true });
  });
}
