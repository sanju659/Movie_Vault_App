import "server-only";
import { Types, type PipelineStage } from "mongoose";
import { getEnv } from "@/server/env";
import { connectDb } from "@/server/db";
import { LibraryItem, type LibraryItemDoc } from "@/server/models/LibraryItem";
import { WatchEvent } from "@/server/models/WatchEvent";
import { getMediaDetails } from "@/server/services/tmdb/movies";
import { TmdbError } from "@/server/services/tmdb/client";
import { AppError, isDuplicateKeyError } from "@/server/errors";
import { GENRE_NAMES } from "@/lib/genres";
import type { MediaType } from "@/lib/media";
import type { MovieDetails } from "@/lib/movie-types";
import type { ListQuery } from "@/server/validation/library";
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
const scope = (userId: string, mediaType: MediaType, tmdbId: number) => ({
  userId: oid(userId),
  mediaType,
  tmdbId,
});

function buildSnapshot(d: MovieDetails): LibraryItemDoc["snapshot"] {
  return {
    title: d.title,
    posterPath: d.posterPath,
    releaseDate: d.releaseDate,
    runtimeMinutes: d.runtimeMinutes, // null for series
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

async function loadDetails(mediaType: MediaType, tmdbId: number) {
  try {
    return await getMediaDetails(mediaType, tmdbId);
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) {
      throw new AppError(404, "TITLE_NOT_FOUND", "That title does not exist.");
    }
    throw err;
  }
}

function toView(doc: LibraryItemDoc): LibraryItemView {
  return {
    mediaType: doc.mediaType,
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
  mediaType: MediaType,
  tmdbId: number,
): Promise<LibraryItemView | null> {
  await connectDb();
  const doc = await LibraryItem.findOne(
    scope(userId, mediaType, tmdbId),
  ).lean<LibraryItemDoc>();
  return doc ? toView(doc) : null;
}

/**
 * Add a title to the library, or change the status of an existing item.
 *
 * Status changes to 'watched' with a date go through logViewing() in
 * watchEvents.ts (rule 5.3.3), which calls this function. Choosing "skip date"
 * in the UI calls this directly, so a title can be Watched with no viewing.
 */
export async function setStatus(
  userId: string,
  mediaType: MediaType,
  tmdbId: number,
  status: LibraryStatus,
): Promise<LibraryItemView> {
  await connectDb();
  const filter = scope(userId, mediaType, tmdbId);

  const existing = await LibraryItem.findOne(filter);
  if (existing) {
    existing.status = status;
    if (isStale(existing.snapshot.snapshotAt)) {
      try {
        existing.snapshot = buildSnapshot(
          await getMediaDetails(mediaType, tmdbId),
        );
      } catch {
        // TMDB hiccup: keep the old snapshot, the status change still succeeds
      }
    }
    await existing.save();
    return toView(existing);
  }

  const details = await loadDetails(mediaType, tmdbId); // a snapshot is required to create the item
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
      // Two requests added the same title at once: just apply the status
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
  mediaType: MediaType,
  tmdbId: number,
  rating: number | null,
): Promise<LibraryItemView> {
  await connectDb();
  const doc = await LibraryItem.findOneAndUpdate(
    scope(userId, mediaType, tmdbId),
    { $set: { personalRating: rating } },
    { new: true, runValidators: true },
  ).lean<LibraryItemDoc>();

  if (!doc) {
    throw new AppError(
      409,
      "NOT_IN_LIBRARY",
      "Add this title to your library before rating it.",
    );
  }
  return toView(doc);
}

/**
 * Remove a title from the library. Idempotent.
 * Viewings are only deleted when the user explicitly asks (rule 5);
 * otherwise they stay as valid "orphaned" history.
 */
export async function removeItem(
  userId: string,
  mediaType: MediaType,
  tmdbId: number,
  deleteEvents = false,
) {
  await connectDb();
  const filter = scope(userId, mediaType, tmdbId);
  const res = await LibraryItem.deleteOne(filter);
  let deletedEvents = 0;
  if (deleteEvents) {
    const r = await WatchEvent.deleteMany(filter);
    deletedEvents = r.deletedCount;
  }
  return { removed: res.deletedCount > 0, deletedEvents };
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
  opts: ListQuery,
): Promise<LibraryList> {
  await connectDb();

  const filter: Record<string, unknown> = { userId: oid(userId) };
  if (opts.media) filter.mediaType = opts.media;
  if (opts.status) filter.status = opts.status;
  if (opts.q)
    filter["snapshot.title"] = { $regex: escapeRegex(opts.q), $options: "i" };

  if (opts.genre) filter["snapshot.genreIds"] = opts.genre; // array contains this id
  if (opts.year) {
    // "YYYY-MM-DD" strings compare correctly, so a range works
    filter["snapshot.releaseDate"] = {
      $gte: `${opts.year}-01-01`,
      $lt: `${opts.year + 1}-01-01`,
    };
  }
  if (opts.rating === "unrated")
    filter.personalRating = null; // matches null or missing
  else if (opts.rating)
    filter.personalRating = { $gte: Number(opts.rating) * 2 }; // stars -> 1-10

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

/** Counts across movies AND series: per status, per media type, and overall. */
export async function getCounts(userId: string): Promise<LibraryCounts> {
  await connectDb();
  const rows = await LibraryItem.aggregate<{
    _id: { status: LibraryStatus; media: "movie" | "tv" };
    n: number;
  }>([
    { $match: { userId: oid(userId) } },
    {
      $group: {
        _id: { status: "$status", media: "$mediaType" },
        n: { $sum: 1 },
      },
    },
  ]);
  const counts: LibraryCounts = {
    watchlist: 0,
    watching: 0,
    watched: 0,
    total: 0,
    media: { movie: 0, tv: 0 },
  };
  for (const r of rows) {
    counts[r._id.status] += r.n;
    counts.total += r.n;
    if (r._id.media in counts.media) counts.media[r._id.media] += r.n;
  }
  return counts;
}

export type FilterOptions = {
  years: number[];
  genres: { id: number; name: string }[];
};

/** Dropdown options built from what is actually in the library (optionally for one media type). */
export async function getFilterOptions(
  userId: string,
  media?: MediaType,
): Promise<FilterOptions> {
  await connectDb();
  const base: PipelineStage = {
    $match: { userId: oid(userId), ...(media ? { mediaType: media } : {}) },
  };

  const [yearRows, genreRows] = await Promise.all([
    LibraryItem.aggregate<{ _id: string }>([
      base,
      { $match: { "snapshot.releaseDate": { $type: "string" } } },
      { $group: { _id: { $substrBytes: ["$snapshot.releaseDate", 0, 4] } } },
    ]),
    LibraryItem.aggregate<{ _id: number }>([
      base,
      { $unwind: "$snapshot.genreIds" },
      { $group: { _id: "$snapshot.genreIds" } },
    ]),
  ]);

  const years = yearRows
    .map((r) => r._id)
    .filter((y) => /^\d{4}$/.test(y))
    .map(Number)
    .sort((a, b) => b - a);

  const genres = genreRows
    .filter((r) => r._id in GENRE_NAMES) // ignore ids we have no name for
    .map((r) => ({ id: r._id, name: GENRE_NAMES[r._id] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { years, genres };
}
