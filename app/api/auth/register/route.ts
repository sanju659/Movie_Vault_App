import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/server/db";
import { User } from "@/server/models/User";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { assertSameOrigin, readJson } from "@/server/auth/origin";
import { registerSchema } from "@/server/validation/auth";
import { AppError, handle, isDuplicateKeyError } from "@/server/errors";
import { clientIp, enforceRateLimit } from "@/server/services/rateLimit";

export function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    await enforceRateLimit(`register:${clientIp(req)}`, 10, 3600); // 10 sign-ups per IP per hour
    const body = registerSchema.parse(await readJson(req));

    await connectDb();
    const passwordHash = await hashPassword(body.password);

    let user;
    try {
      user = await User.create({
        displayName: body.displayName,
        email: body.email,
        passwordHash,
        timezone: body.timezone,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new AppError(
          409,
          "EMAIL_TAKEN",
          "An account with this email already exists.",
          {
            email: "This email is already registered",
          },
        );
      }
      throw err;
    }

    await createSession(String(user._id), user.tokenVersion ?? 0);
    return NextResponse.json(
      {
        user: {
          id: String(user._id),
          displayName: user.displayName,
          email: user.email,
          timezone: user.timezone,
        },
      },
      { status: 201 },
    );
  });
}
