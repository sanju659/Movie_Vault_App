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
import { revalidatePath } from "next/cache";
import { updateProfileSchema } from "@/server/validation/auth";

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

export function PATCH(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const current = await requireUser();
    await enforceRateLimit(`profile:${current.id}`, 20);

    const { timezone } = updateProfileSchema.parse(await readJson(req));

    await connectDb();
    const user = await User.findByIdAndUpdate(
      current.id,
      { $set: { timezone } },
      { new: true },
    );
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "Account not found.");

    // "Today" is computed per request from the saved timezone, so refresh every cached page
    revalidatePath("/", "layout");
    return NextResponse.json({ timezone: user.timezone });
  });
}
