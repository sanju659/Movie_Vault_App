import "server-only";
import { hash, verify } from "@node-rs/argon2"; // argon2id by default
import { randomBytes } from "node:crypto";

export function hashPassword(password: string) {
  return hash(password);
}

export async function verifyPassword(hashed: string, password: string) {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

// Burn the same time as a real check when the email doesn't exist,
// so response timing doesn't reveal which emails are registered.
let dummyHash: Promise<string> | undefined;
export async function fakeVerify(password: string) {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(await dummyHash, password);
}
