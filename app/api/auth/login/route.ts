import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { User } from "@/server/models/User";
import { fakeVerify, verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { assertSameOrigin, readJson } from "@/server/auth/origin";
import { loginSchema } from "@/server/validation/auth";
import { AppError, handle } from "@/server/errors";
import { clientIp, enforceRateLimit } from "@/server/services/rateLimit";

export function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const limit = getEnv().AUTH_THROTTLE_LIMIT;
    const ip = clientIp(req);

    // Broad cap per IP, before doing any work
    await enforceRateLimit(`login:ip:${ip}`, limit * 4);

    const { email, password } = loginSchema.parse(await readJson(req));

    // Per IP + account: a short burst limit and a slower hourly limit.
    // Including the IP means a stranger can't lock the real owner out.
    await enforceRateLimit(`login:${ip}:${email}`, limit);
    await enforceRateLimit(`login:${ip}:${email}`, limit * 4, 3600);

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
