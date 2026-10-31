import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/server/env";
import { connectDb } from "@/server/db";
import { User } from "@/server/models/User";
import { AppError } from "@/server/errors";

export type PublicUser = {
  id: string;
  displayName: string;
  email: string;
  timezone: string;
};

const signingKey = () => new TextEncoder().encode(getEnv().SESSION_SECRET);

export async function createSession(userId: string, tokenVersion = 0) {
  const env = getEnv();
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const token = await new SignJWT({ ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(signingKey());

  (await cookies()).set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  (await cookies()).delete(getEnv().SESSION_COOKIE_NAME);
}

async function readToken(): Promise<{ sub: string; ver: number } | null> {
  const token = (await cookies()).get(getEnv().SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub || !isValidObjectId(payload.sub)) return null;
    return { sub: payload.sub, ver: Number(payload.ver ?? 0) };
  } catch {
    return null; // bad signature, expired, or malformed
  }
}

// cache() = one lookup per request, even if several components call it
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const claims = await readToken();
  if (!claims) return null;

  await connectDb(); // a DB error here should surface, not silently sign the user out
  const user = await User.findById(claims.sub).lean();
  if (!user || (user.tokenVersion ?? 0) !== claims.ver) return null;

  return {
    id: String(user._id),
    displayName: user.displayName,
    email: user.email,
    timezone: user.timezone,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user)
    throw new AppError(401, "UNAUTHENTICATED", "You must be signed in.");
  return user;
}

export async function requireUserOrRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
