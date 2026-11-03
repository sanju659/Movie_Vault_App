import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { User } from "@/server/models/User";
import { verifyPassword } from "@/server/auth/password";
import { destroySession, requireUser } from "@/server/auth/session";
import { assertSameOrigin, readJson } from "@/server/auth/origin";
import { deleteAccountSchema } from "@/server/validation/auth";
import { AppError, handle } from "@/server/errors";
import { deleteAccount } from "@/server/services/account";
import { enforceRateLimit } from "@/server/services/rateLimit";

export function DELETE(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const current = await requireUser();
    await enforceRateLimit(
      `delete:${current.id}`,
      getEnv().AUTH_THROTTLE_LIMIT,
    );

    const { password } = deleteAccountSchema.parse(await readJson(req));

    await connectDb();
    const user = await User.findById(current.id).select("+passwordHash");
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new AppError(400, "INVALID_PASSWORD", "Incorrect password.", {
        password: "Incorrect password",
      });
    }

    await deleteAccount(current.id);
    await destroySession();
    return NextResponse.json({ ok: true });
  });
}
