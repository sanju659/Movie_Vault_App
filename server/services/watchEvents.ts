import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { WatchEvent, type WatchEventLean } from "@/server/models/WatchEvent";
import { LibraryItem, type LibraryItemDoc } from "@/server/models/LibraryItem";
import { TmdbCache } from "@/server/models/TmdbCache";
import { getItem, setStatus } from "@/server/services/library";
import { AppError } from "@/server/errors";
import { todayIn } from "@/lib/dates";
import type { PublicUser } from "@/server/auth/session";
import type { MovieDetails } from "@/lib/movie-types";
import type {
  HistoryEntry,
  HistoryList,
  ViewingEventView,
} from "@/lib/watch-types";

const PAGE_SIZE = 30;
const oid = (id: string) => new Types.ObjectId(id);

type EventInput = { watchedOn: string; notes: string | null };

function assertNotFuture(timezone: string, watchedOn: string) {
  if (watchedOn > todayIn(timezone)) {
    throw new AppError(
      400,
      "DATE_IN_FUTURE",
      "You can't record a viewing in the future.",
      {
        watchedOn: "Date is in the future",
      },
    );
  }
}

// Sort key for "which viewing came first": date, then creation time, then id
const sortKey = (e: WatchEventLean) =>
  `${e.watchedOn}|${new Date(e.createdAt).toISOString()}|${String(e._id)}`;

const toView = (e: WatchEventLean, isRewatch: boolean): ViewingEventView => ({
  id: String(e._id),
  tmdbId: e.tmdbId,
  watchedOn: e.watchedOn,
  notes: e.notes ?? null,
  isRewatch,
});

/** First (earliest) viewing id per title, across ALL of the user's history. */
async function firstEventIds(userId: string, tmdbIds: number[]) {
  const rows = await WatchEvent.find({
    userId: oid(userId),
    mediaType: "movie",
    tmdbId: { $in: tmdbIds },
  })
    .select("tmdbId watchedOn createdAt")
    .lean<WatchEventLean[]>();

  const best = new Map<number, WatchEventLean>();
  for (const r of rows) {
    const cur = best.get(r.tmdbId);
    if (!cur || sortKey(r) < sortKey(cur)) best.set(r.tmdbId, r);
  }
  return new Map([...best].map(([tmdbId, e]) => [tmdbId, String(e._id)]));
}

/**
 * Record a viewing and keep the library status consistent:
 *  3a. no library item   -> create one with status "watched"
 *  3b. watchlist/watching -> set status to "watched"
 * The library change happens first, so an event never exists without a snapshot.
 */
export async function logViewing(
  user: PublicUser,
  tmdbId: number,
  input: EventInput,
) {
  assertNotFuture(user.timezone, input.watchedOn);
  await connectDb();

  const existing = await getItem(user.id, tmdbId);
  if (!existing || existing.status !== "watched") {
    await setStatus(user.id, tmdbId, "watched");
  }

  const doc = await WatchEvent.create({
    userId: oid(user.id),
    tmdbId,
    mediaType: "movie",
    watchedOn: input.watchedOn,
    notes: input.notes,
  });
  return { id: String(doc._id) };
}

export async function updateEvent(
  user: PublicUser,
  eventId: string,
  input: EventInput,
) {
  assertNotFuture(user.timezone, input.watchedOn);
  await connectDb();
  const doc = await WatchEvent.findOneAndUpdate(
    { _id: oid(eventId), userId: oid(user.id) }, // other users' events look like "not found"
    { $set: { watchedOn: input.watchedOn, notes: input.notes } },
    { new: true, runValidators: true },
  ).lean<WatchEventLean>();
  if (!doc)
    throw new AppError(
      404,
      "EVENT_NOT_FOUND",
      "That viewing no longer exists.",
    );
  return { tmdbId: doc.tmdbId };
}

/** Deleting a viewing never changes the library status (rule 3e). Idempotent. */
export async function deleteEvent(userId: string, eventId: string) {
  await connectDb();
  const res = await WatchEvent.deleteOne({
    _id: oid(eventId),
    userId: oid(userId),
  });
  return res.deletedCount > 0;
}

/** All viewings of one movie, newest first. */
export async function listEventsForMovie(
  userId: string,
  tmdbId: number,
): Promise<ViewingEventView[]> {
  await connectDb();
  const docs = await WatchEvent.find({
    userId: oid(userId),
    mediaType: "movie",
    tmdbId,
  }).lean<WatchEventLean[]>();
  docs.sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1)); // newest first
  const firstId = docs.length ? String(docs[docs.length - 1]._id) : null;
  return docs.map((d) => toView(d, String(d._id) !== firstId));
}

/** The timeline across all movies, newest first. */
export async function listHistory(
  userId: string,
  page: number,
): Promise<HistoryList> {
  await connectDb();
  const filter = { userId: oid(userId), mediaType: "movie" as const };

  const [docs, total] = await Promise.all([
    WatchEvent.find(filter)
      .sort({ watchedOn: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean<WatchEventLean[]>(),
    WatchEvent.countDocuments(filter),
  ]);

  const ids = [...new Set(docs.map((d) => d.tmdbId))];
  const [firsts, items] = await Promise.all([
    firstEventIds(userId, ids),
    LibraryItem.find({ ...filter, tmdbId: { $in: ids } })
      .select("tmdbId snapshot")
      .lean<Pick<LibraryItemDoc, "tmdbId" | "snapshot">[]>(),
  ]);

  type Info = {
    title: string;
    posterPath: string | null;
    releaseDate: string | null;
  };
  const info = new Map<number, Info>();
  for (const i of items) {
    info.set(i.tmdbId, {
      title: i.snapshot.title,
      posterPath: i.snapshot.posterPath ?? null,
      releaseDate: i.snapshot.releaseDate ?? null,
    });
  }

  // Orphaned events (library item removed) fall back to the shared TMDB cache
  const missing = ids.filter((id) => !info.has(id));
  if (missing.length) {
    const cached = await TmdbCache.find({
      mediaType: "movie",
      tmdbId: { $in: missing },
    })
      .select("tmdbId data")
      .lean<{ tmdbId: number; data: unknown }[]>();
    for (const c of cached) {
      const d = c.data as MovieDetails;
      info.set(c.tmdbId, {
        title: d.title,
        posterPath: d.posterPath,
        releaseDate: d.releaseDate,
      });
    }
  }

  const entries: HistoryEntry[] = docs.map((d) => ({
    ...toView(d, firsts.get(d.tmdbId) !== String(d._id)),
    ...(info.get(d.tmdbId) ?? {
      title: "Unknown title",
      posterPath: null,
      releaseDate: null,
    }),
  }));

  return {
    entries,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
  };
}
