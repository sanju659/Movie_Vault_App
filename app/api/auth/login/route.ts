import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import { User } from "@/server/models/User";
import { fakeVerify, verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { assertSameOrigin, readJson } from "@/server/auth/origin";
import { loginSchema } from "@/server/validation/auth";
import { AppError, handle } from "@/server/errors";

export function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const { email, password } = loginSchema.parse(await readJson(req));

    await connectDb();
    const user = await User.findOne({ email }).select("+passwordHash");

    const ok = user
      ? await verifyPassword(user.passwordHash, password)
      : (await fakeVerify(password), false);
    if (!user || !ok) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    await createSession(String(user._id), user.tokenVersion ?? 0);
    return NextResponse.json({
      user: {
        id: String(user._id),
        displayName: user.displayName,
        email: user.email,
        timezone: user.timezone,
      },
    });
  });
}
