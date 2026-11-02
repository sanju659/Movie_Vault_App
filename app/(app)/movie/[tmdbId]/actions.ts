"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { removeItem, setRating, setStatus } from "@/server/services/library";
import {
  deleteEvent,
  logViewing,
  updateEvent,
} from "@/server/services/watchEvents";
import {
  ratingSchema,
  statusSchema,
  tmdbIdSchema,
} from "@/server/validation/library";
import { eventIdSchema, eventInputSchema } from "@/server/validation/watch";

export type ActionResult = { ok: true } | { ok: false; message: string };

const INVALID: ActionResult = { ok: false, message: "Invalid request." };

// Actions return a result instead of throwing, so the client can show a message
async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    revalidatePath("/movie/[tmdbId]", "page");
    revalidatePath("/dashboard");
    revalidatePath("/history");
    revalidatePath("/collection", "layout");
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
  if (!id.success || !st.success) return INVALID;

  return run(async () => {
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
  if (!id.success || !r.success) return INVALID;

  return run(async () => {
    const user = await requireUser();
    await setRating(user.id, id.data, r.data);
  });
}

export async function removeAction(
  tmdbId: number,
  deleteEvents: boolean,
): Promise<ActionResult> {
  const id = tmdbIdSchema.safeParse(tmdbId);
  const del = z.boolean().safeParse(deleteEvents);
  if (!id.success || !del.success) return INVALID;

  return run(async () => {
    const user = await requireUser();
    await removeItem(user.id, id.data, del.data);
  });
}

export async function logViewingAction(
  tmdbId: number,
  watchedOn: string,
  notes: string,
): Promise<ActionResult> {
  const id = tmdbIdSchema.safeParse(tmdbId);
  const input = eventInputSchema.safeParse({ watchedOn, notes });
  if (!id.success) return INVALID;
  if (!input.success)
    return {
      ok: false,
      message: input.error.issues[0]?.message ?? "Invalid request.",
    };

  return run(async () => {
    const user = await requireUser();
    await logViewing(user, id.data, input.data);
  });
}

export async function updateEventAction(
  eventId: string,
  watchedOn: string,
  notes: string,
): Promise<ActionResult> {
  const eid = eventIdSchema.safeParse(eventId);
  const input = eventInputSchema.safeParse({ watchedOn, notes });
  if (!eid.success) return INVALID;
  if (!input.success)
    return {
      ok: false,
      message: input.error.issues[0]?.message ?? "Invalid request.",
    };

  return run(async () => {
    const user = await requireUser();
    await updateEvent(user, eid.data, input.data);
  });
}

export async function deleteEventAction(
  eventId: string,
): Promise<ActionResult> {
  const eid = eventIdSchema.safeParse(eventId);
  if (!eid.success) return INVALID;

  return run(async () => {
    const user = await requireUser();
    await deleteEvent(user.id, eid.data);
  });
}
