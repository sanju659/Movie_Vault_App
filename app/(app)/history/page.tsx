import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserOrRedirect } from "@/server/auth/session";
import { listHistory } from "@/server/services/watchEvents";
import { formatMonth, todayIn } from "@/lib/dates";
import { releaseYear } from "@/lib/tmdb";
import type { HistoryEntry } from "@/lib/watch-types";
import MoviePoster from "@/components/MoviePoster";
import ViewingEntry from "@/components/ViewingEntry";

export const metadata = { title: "Watch History" };

type Props = { searchParams: Promise<{ page?: string | string[] }> };

export default async function HistoryPage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const sp = await searchParams;
  const raw = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;
  const page = Math.min(Math.max(Number.isFinite(raw) ? raw : 1, 1), 1000);

  const data = await listHistory(user.id, page);
  if (page > data.totalPages)
    redirect(
      data.totalPages > 1 ? `/history?page=${data.totalPages}` : "/history",
    );

  const today = todayIn(user.timezone);

  // Group by the viewing's own calendar month (no timezone math needed)
  const groups = new Map<string, HistoryEntry[]>();
  for (const e of data.entries) {
    const key = e.watchedOn.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Watch History</h1>

      {data.total === 0 ? (
        <div className="rounded-lg border border-neutral-800 p-6 text-center">
          <p className="text-neutral-300">No viewings recorded yet.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Open a movie and use “Record a viewing”, or mark it as Watched with
            a date.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-block rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black"
          >
            Discover movies
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-neutral-400">
            {data.total.toLocaleString()}{" "}
            {data.total === 1 ? "viewing" : "viewings"}
          </p>

          {[...groups].map(([month, entries]) => (
            <section
              key={month}
              aria-labelledby={`m-${month}`}
              className="mb-8"
            >
              <h2
                id={`m-${month}`}
                className="mb-3 border-b border-neutral-800 pb-1 text-lg font-semibold"
              >
                {formatMonth(month)}
              </h2>
              <ul className="space-y-4">
                {entries.map((e) => (
                  <li key={e.id} className="flex gap-4">
                    <div className="w-16 shrink-0">
                      <Link href={`/movie/${e.tmdbId}`}>
                        <MoviePoster
                          path={e.posterPath}
                          title={e.title}
                          size="w185"
                        />
                      </Link>
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/movie/${e.tmdbId}`}
                        className="font-medium hover:underline"
                      >
                        {e.title}
                      </Link>
                      <span className="text-sm text-neutral-400">
                        {" "}
                        {releaseYear(e.releaseDate) ?? ""}
                      </span>
                      <div className="mt-1">
                        <ViewingEntry event={e} today={today} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {data.totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-6 flex items-center gap-4 text-sm"
            >
              {data.page > 1 && (
                <Link
                  href={`/history?page=${data.page - 1}`}
                  className="underline"
                >
                  Previous
                </Link>
              )}
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              {data.page < data.totalPages && (
                <Link
                  href={`/history?page=${data.page + 1}`}
                  className="underline"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
