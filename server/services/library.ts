import "server-only";
import { Types } from "mongoose";
import { getEnv } from "@/server/env";
import { connectDb } from "@/server/db";
import { LibraryItem, type LibraryItemDoc } from "@/server/models/LibraryItem";
import { getMovieDetails } from "@/server/services/tmdb/movies";
import { TmdbError } from "@/server/services/tmdb/client";
import { AppError, isDuplicateKeyError } from "@/server/errors";
import type { MovieDetails } from "@/lib/movie-types";
import type {
  LibraryCounts,
  LibraryItemView,
  LibraryList,
  LibrarySort,
  LibraryStatus,
} from "@/lib/library-types";

const PAGE_SIZE = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

const oid = (id: string) => new Types.ObjectId(id);
const scope = (userId: string, tmdbId: number) => ({
  userId: oid(userId),
  mediaType: "movie" as const,
  tmdbId,
});

function buildSnapshot(d: MovieDetails): LibraryItemDoc["snapshot"] {
  return {
    title: d.title,
    posterPath: d.posterPath,
    releaseDate: d.releaseDate,
    runtimeMinutes: d.runtimeMinutes,
    genreIds: d.genres.map((g) => g.id),
    snapshotAt: new Date(),
  };
}

function isStale(snapshotAt: Date) {
  return (
    Date.now() - new Date(snapshotAt).getTime() >
    getEnv().LIBRARY_SNAPSHOT_MAX_AGE_DAYS * DAY_MS
  );
}

async function loadDetails(tmdbId: number) {
  try {
    return await getMovieDetails(tmdbId);
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) {
      throw new AppError(404, "MOVIE_NOT_FOUND", "That movie does not exist.");
    }
    throw err;
  }
}

function toView(doc: LibraryItemDoc): LibraryItemView {
  return {
    tmdbId: doc.tmdbId,
    status: doc.status,
    personalRating: doc.personalRating ?? null,
    title: doc.snapshot.title,
    posterPath: doc.snapshot.posterPath ?? null,
    releaseDate: doc.snapshot.releaseDate ?? null,
    runtimeMinutes: doc.snapshot.runtimeMinutes ?? null,
    genreIds: [...doc.snapshot.genreIds],
    addedAt: new Date(doc.addedAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export async function getItem(
  userId: string,
  tmdbId: number,
): Promise<LibraryItemView | null> {
  await connectDb();
  const doc = await LibraryItem.findOne(
    scope(userId, tmdbId),
  ).lean<LibraryItemDoc>();
  return doc ? toView(doc) : null;
}

/**
 * Add a movie to the library, or change the status of an existing item.
 *
 * Phase 4 note: when status becomes 'watched', the status/event sync service
 * (rule 5.3.3) will wrap this function and also create the viewing event.
 * Keep all status changes going through here so there is one place to hook in.
 */
export async function setStatus(
  userId: string,
  tmdbId: number,
  status: LibraryStatus,
): Promise<LibraryItemView> {
  await connectDb();
  const filter = scope(userId, tmdbId);

  const existing = await LibraryItem.findOne(filter);
  if (existing) {
    existing.status = status;
    if (isStale(existing.snapshot.snapshotAt)) {
      try {
        existing.snapshot = buildSnapshot(await getMovieDetails(tmdbId));
      } catch {
        // TMDB hiccup: keep the old snapshot, the status change still succeeds
      }
    }
    await existing.save();
    return toView(existing);
  }

  const details = await loadDetails(tmdbId); // a snapshot is required to create the item
  try {
    const created = await LibraryItem.create({
      ...filter,
      status,
      personalRating: null,
      snapshot: buildSnapshot(details),
    });
    return toView(created);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      // Two requests added the same movie at once: just apply the status
      const doc = await LibraryItem.findOneAndUpdate(
        filter,
        { $set: { status } },
        { new: true },
      ).lean<LibraryItemDoc>();
      if (doc) return toView(doc);
    }
    throw err;
  }
}

/** Set (1-10) or clear (null) the personal rating. The item must already exist. */
export async function setRating(
  userId: string,
  tmdbId: number,
  rating: number | null,
): Promise<LibraryItemView> {
  await connectDb();
  const doc = await LibraryItem.findOneAndUpdate(
    scope(userId, tmdbId),
    { $set: { personalRating: rating } },
    { new: true, runValidators: true },
  ).lean<LibraryItemDoc>();

  if (!doc) {
    throw new AppError(
      409,
      "NOT_IN_LIBRARY",
      "Add this movie to your library before rating it.",
    );
  }
  return toView(doc);
}

/**
 * Remove a title from the library. Idempotent.
 * Phase 4 will add the explicit "also delete my viewings" option (rule 5.3.5);
 * until events exist there is nothing else to delete.
 */
export async function removeItem(
  userId: string,
  tmdbId: number,
): Promise<boolean> {
  await connectDb();
  const res = await LibraryItem.deleteOne(scope(userId, tmdbId));
  return res.deletedCount > 0;
}

const SORTS: Record<LibrarySort, Record<string, 1 | -1>> = {
  added: { addedAt: -1, _id: -1 },
  title: { "snapshot.title": 1, _id: 1 },
  release: { "snapshot.releaseDate": -1, _id: -1 }, // "YYYY-MM-DD" sorts correctly as text
  rating: { personalRating: -1, addedAt: -1, _id: -1 }, // unrated items land last
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listLibrary(
  userId: string,
  opts: { status?: LibraryStatus; sort: LibrarySort; q?: string; page: number },
): Promise<LibraryList> {
  await connectDb();

  const filter: Record<string, unknown> = {
    userId: oid(userId),
    mediaType: "movie",
  };
  if (opts.status) filter.status = opts.status;
  if (opts.q)
    filter["snapshot.title"] = { $regex: escapeRegex(opts.q), $options: "i" };

  const [docs, total] = await Promise.all([
    LibraryItem.find(filter)
      .sort(SORTS[opts.sort])
      .collation({ locale: "en", strength: 2 }) // case-insensitive title sort
      .skip((opts.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean<LibraryItemDoc[]>(),
    LibraryItem.countDocuments(filter),
  ]);

  return {
    items: docs.map(toView),
    page: opts.page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
  };
}

export async function getCounts(userId: string): Promise<LibraryCounts> {
  await connectDb();
  const rows = await LibraryItem.aggregate<{ _id: LibraryStatus; n: number }>([
    { $match: { userId: oid(userId), mediaType: "movie" } },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const counts: LibraryCounts = {
    watchlist: 0,
    watching: 0,
    watched: 0,
    total: 0,
  };
  for (const r of rows) {
    counts[r._id] = r.n;
    counts.total += r.n;
  }
  return counts;
}
