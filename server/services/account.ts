import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { User } from "@/server/models/User";
import { LibraryItem, type LibraryItemDoc } from "@/server/models/LibraryItem";
import { WatchEvent, type WatchEventLean } from "@/server/models/WatchEvent";
import { AppError } from "@/server/errors";

const oid = (id: string) => new Types.ObjectId(id);

/**
 * Everything the user owns, and nothing else (no password hash, no token version,
 * nothing from other users, no shared TMDB cache).
 * PHASE 5: add reviews and custom collections here AND in deleteAccount below.
 */
export async function exportUserData(userId: string) {
  await connectDb();
  const filter = { userId: oid(userId) };

  const [user, library, events] = await Promise.all([
    User.findById(userId).lean(),
    LibraryItem.find(filter).sort({ addedAt: 1 }).lean<LibraryItemDoc[]>(),
    WatchEvent.find(filter)
      .sort({ watchedOn: 1, createdAt: 1 })
      .lean<WatchEventLean[]>(),
  ]);
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "Account not found.");

  return {
    format: "watchvault-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: {
      personalRating:
        "Whole numbers 1-10, where 10 = 5 stars (divide by 2 for stars).",
      watchedOn: "Calendar date (YYYY-MM-DD) in your own timezone.",
      movieData:
        "Titles and posters come from TMDB; tmdbId identifies the movie there.",
    },
    account: {
      displayName: user.displayName,
      email: user.email,
      timezone: user.timezone,
      createdAt:
        (user as unknown as { createdAt?: Date }).createdAt?.toISOString() ??
        null,
    },
    library: library.map((i) => ({
      tmdbId: i.tmdbId,
      mediaType: i.mediaType,
      title: i.snapshot.title,
      releaseDate: i.snapshot.releaseDate ?? null,
      status: i.status,
      personalRating: i.personalRating ?? null,
      addedAt: new Date(i.addedAt).toISOString(),
      updatedAt: new Date(i.updatedAt).toISOString(),
    })),
    viewings: events.map((e) => ({
      tmdbId: e.tmdbId,
      mediaType: e.mediaType,
      watchedOn: e.watchedOn,
      notes: e.notes ?? null,
      createdAt: new Date(e.createdAt).toISOString(),
      updatedAt: new Date(e.updatedAt).toISOString(),
    })),
  };
}

/**
 * Rule 11: remove ALL user-owned documents. Data first, user last,
 * so a partial failure can simply be retried while the account still exists.
 * Shared TMDB cache entries are not user data and stay.
 * PHASE 5: add Review and CustomCollection deletes here.
 */
export async function deleteAccount(userId: string) {
  await connectDb();
  const filter = { userId: oid(userId) };
  await Promise.all([
    WatchEvent.deleteMany(filter),
    LibraryItem.deleteMany(filter),
  ]);
  await User.deleteOne({ _id: oid(userId) });
}
