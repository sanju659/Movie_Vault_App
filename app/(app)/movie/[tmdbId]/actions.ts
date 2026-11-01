"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { removeItem, setRating, setStatus } from "@/server/services/library";
import {
  ratingSchema,
  statusSchema,
  tmdbIdSchema,
} from "@/server/validation/library";

export type ActionResult = { ok: true } | { ok: false; message: string };

// Actions return a result instead of throwing, so the client can show a message
async function run(
  tmdbId: number,
  fn: () => Promise<unknown>,
): Promise<ActionResult> {
  try {
    await fn();
    revalidatePath(`/movie/${tmdbId}`);
    revalidatePath("/dashboard");
    revalidatePath("/collection", "layout"); // collection pages arrive in the next step
    return { ok: true };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function setStatusAction(
  tmdbId: number,
  status: string,
): Promise<ActionResult> {
  const id = tmdbIdSchema.safeParse(tmdbId);
  const st = statusSchema.safeParse(status);
  if (!id.success || !st.success)
    return { ok: false, message: "Invalid request." };

  return run(id.data, async () => {
    const user = await requireUser(); // userId always comes from the session, never the client
    await setStatus(user.id, id.data, st.data);
  });
}

export async function setRatingAction(
  tmdbId: number,
  rating: number | null,
): Promise<ActionResult> {
  const id = tmdbIdSchema.safeParse(tmdbId);
  const r = ratingSchema.safeParse(rating);
  if (!id.success || !r.success)
    return { ok: false, message: "Invalid request." };

  return run(id.data, async () => {
    const user = await requireUser();
    await setRating(user.id, id.data, r.data);
  });
}

export async function removeAction(tmdbId: number): Promise<ActionResult> {
  const id = tmdbIdSchema.safeParse(tmdbId);
  if (!id.success) return { ok: false, message: "Invalid request." };

  return run(id.data, async () => {
    const user = await requireUser();
    await removeItem(user.id, id.data);
  });
}
