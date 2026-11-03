import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { User } from "@/server/models/User";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, requireUser } from "@/server/auth/session";
import { assertSameOrigin, readJson } from "@/server/auth/origin";
import { changePasswordSchema } from "@/server/validation/auth";
import { AppError, handle } from "@/server/errors";
import { enforceRateLimit } from "@/server/services/rateLimit";

export function PATCH(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const current = await requireUser();
    await enforceRateLimit(`pw:${current.id}`, getEnv().AUTH_THROTTLE_LIMIT);

    const { currentPassword, newPassword } = changePasswordSchema.parse(
      await readJson(req),
    );

    await connectDb();
    const user = await User.findById(current.id).select("+passwordHash");
    // 400, not 401: the client treats 401 as "signed out"
    if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new AppError(
        400,
        "INVALID_PASSWORD",
        "Your current password is incorrect.",
        {
          currentPassword: "Incorrect password",
        },
      );
    }

    // Bumping tokenVersion invalidates every existing JWT, on every device
    const updated = await User.findByIdAndUpdate(
      current.id,
      {
        $set: { passwordHash: await hashPassword(newPassword) },
        $inc: { tokenVersion: 1 },
      },
      { new: true },
    );
    if (!updated)
      throw new AppError(404, "USER_NOT_FOUND", "Account not found.");

    // Re-issue this device's cookie so the user stays signed in here
    await createSession(String(updated._id), updated.tokenVersion);
    return NextResponse.json({ ok: true });
  });
}
