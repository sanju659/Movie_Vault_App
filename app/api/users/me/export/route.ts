import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { exportUserData } from "@/server/services/account";
import { enforceRateLimit } from "@/server/services/rateLimit";

export function GET() {
  return handle(async () => {
    const user = await requireUser();
    await enforceRateLimit(`export:${user.id}`, 10, 3600);

    const data = await exportUserData(user.id);
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="watchvault-export-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
