import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { WatchEvent, type WatchEventLean } from "@/server/models/WatchEvent";
import { LibraryItem, type LibraryItemDoc } from "@/server/models/LibraryItem";
import { TmdbCache } from "@/server/models/TmdbCache";
import { getItem, setStatus } from "@/server/services/library";
import { AppError } from "@/server/errors";
import { todayIn } from "@/lib/dates";
import type { MediaType } from "@/lib/media";
import type { PublicUser } from "@/server/auth/session";
import type { MovieDetails } from "@/lib/movie-types";
import type {
  HistoryEntry,
  HistoryList,
  ViewingEventView,
} from "@/lib/watch-types";

const PAGE_SIZE = 30;
const oid = (id: string) => new Types.ObjectId(id);

// A movie and a series can share the same TMDB number, so always key by both
const keyOf = (mediaType: string, tmdbId: number) => `${mediaType}:${tmdbId}`;

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
  mediaType: e.mediaType,
  tmdbId: e.tmdbId,
  watchedOn: e.watchedOn,
  notes: e.notes ?? null,
  isRewatch,
});

/** First (earliest) viewing id per title ("movie:123"), across ALL of the user's history. */
async function firstEventIds(userId: string, tmdbIds: number[]) {
  const rows = await WatchEvent.find({
    userId: oid(userId),
    tmdbId: { $in: tmdbIds },
  })
    .select("tmdbId mediaType watchedOn createdAt")
    .lean<WatchEventLean[]>();

  const best = new Map<string, WatchEventLean>();
  for (const r of rows) {
    const k = keyOf(r.mediaType, r.tmdbId);
    const cur = best.get(k);
    if (!cur || sortKey(r) < sortKey(cur)) best.set(k, r);
  }
  return new Map([...best].map(([k, e]) => [k, String(e._id)]));
}

/**
 * Record a viewing and keep the library status consistent:
 *  3a. no library item   -> create one with status "watched"
 *  3b. watchlist/watching -> set status to "watched"
 * For a series, a viewing means "finished the whole series".
 * The library change happens first, so an event never exists without a snapshot.
 */
export async function logViewing(
  user: PublicUser,
  mediaType: MediaType,
  tmdbId: number,
  input: EventInput,
) {
  assertNotFuture(user.timezone, input.watchedOn);
  await connectDb();

  const existing = await getItem(user.id, mediaType, tmdbId);
  if (!existing || existing.status !== "watched") {
    await setStatus(user.id, mediaType, tmdbId, "watched");
  }

  const doc = await WatchEvent.create({
    userId: oid(user.id),
    mediaType,
    tmdbId,
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
  return { tmdbId: doc.tmdbId, mediaType: doc.mediaType };
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

/** All viewings of one title, newest first. */
export async function listEventsForTitle(
  userId: string,
  mediaType: MediaType,
  tmdbId: number,
): Promise<ViewingEventView[]> {
  await connectDb();
  const docs = await WatchEvent.find({
    userId: oid(userId),
    mediaType,
    tmdbId,
  }).lean<WatchEventLean[]>();
  docs.sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1)); // newest first
  const firstId = docs.length ? String(docs[docs.length - 1]._id) : null;
  return docs.map((d) => toView(d, String(d._id) !== firstId));
}

/** The timeline across all movies and series, newest first. */
export async function listHistory(
  userId: string,
  page: number,
): Promise<HistoryList> {
  await connectDb();
  const filter = { userId: oid(userId) };

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
      .select("tmdbId mediaType snapshot")
      .lean<Pick<LibraryItemDoc, "tmdbId" | "mediaType" | "snapshot">[]>(),
  ]);

  type Info = {
    title: string;
    posterPath: string | null;
    releaseDate: string | null;
  };
  const info = new Map<string, Info>();
  for (const i of items) {
    info.set(keyOf(i.mediaType, i.tmdbId), {
      title: i.snapshot.title,
      posterPath: i.snapshot.posterPath ?? null,
      releaseDate: i.snapshot.releaseDate ?? null,
    });
  }

  // Orphaned events (library item removed) fall back to the shared TMDB cache
  const missing = [
    ...new Set(
      docs
        .filter((d) => !info.has(keyOf(d.mediaType, d.tmdbId)))
        .map((d) => d.tmdbId),
    ),
  ];
  if (missing.length) {
    const cached = await TmdbCache.find({ tmdbId: { $in: missing } })
      .select("tmdbId mediaType data")
      .lean<{ tmdbId: number; mediaType: MediaType; data: unknown }[]>();
    for (const c of cached) {
      const d = c.data as MovieDetails;
      info.set(keyOf(c.mediaType, c.tmdbId), {
        title: d.title,
        posterPath: d.posterPath,
        releaseDate: d.releaseDate,
      });
    }
  }

  const entries: HistoryEntry[] = docs.map((d) => {
    const key = keyOf(d.mediaType, d.tmdbId);
    return {
      ...toView(d, firsts.get(key) !== String(d._id)),
      ...(info.get(key) ?? {
        title: "Unknown title",
        posterPath: null,
        releaseDate: null,
      }),
    };
  });

  return {
    entries,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
  };
}
