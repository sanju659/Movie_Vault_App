import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserOrRedirect } from "@/server/auth/session";
import { getCounts, listLibrary } from "@/server/services/library";
import { listQuerySchema } from "@/server/validation/library";
import LibraryCard from "@/components/LibraryCard";
import type { LibrarySort, LibraryStatus } from "@/lib/library-types";

export const metadata = { title: "My Collection" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TABS: { label: string; status?: LibraryStatus }[] = [
  { label: "All" },
  { label: "Watched", status: "watched" },
  { label: "Watching", status: "watching" },
  { label: "Watchlist", status: "watchlist" },
];

const SORT_LABELS: Record<LibrarySort, string> = {
  added: "Date added",
  title: "Title",
  release: "Release date",
  rating: "My rating",
};

const EMPTY_MESSAGES: Record<LibraryStatus, string> = {
  watched: "Nothing marked as watched yet.",
  watching: "You're not watching anything right now.",
  watchlist: "Your watchlist is empty.",
};

function href(p: {
  status?: LibraryStatus;
  sort: LibrarySort;
  q?: string;
  page?: number;
}) {
  const sp = new URLSearchParams();
  if (p.status) sp.set("status", p.status);
  if (p.sort !== "added") sp.set("sort", p.sort);
  if (p.q) sp.set("q", p.q);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return s ? `/collection?${s}` : "/collection";
}

export default async function CollectionPage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const query = listQuerySchema.parse(await searchParams);

  const [list, counts] = await Promise.all([
    listLibrary(user.id, query),
    getCounts(user.id),
  ]);

  // Hand-edited or stale link pointing past the last page
  if (query.page > list.totalPages) {
    redirect(href({ ...query, page: list.totalPages }));
  }

  const tabCount = (status?: LibraryStatus) =>
    status ? counts[status] : counts.total;
  const emptyMessage = query.q
    ? `No titles in your collection match “${query.q}”.`
    : query.status
      ? EMPTY_MESSAGES[query.status]
      : "Your collection is empty.";

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">My Collection</h1>

      <nav aria-label="Collection filter" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.status === query.status;
          return (
            <Link
              key={t.label}
              href={href({ status: t.status, sort: query.sort, q: query.q })}
              aria-current={active ? "page" : undefined}
              className={`rounded border px-3 py-1.5 text-sm ${
                active
                  ? "border-amber-500 bg-amber-500 font-medium text-black"
                  : "border-neutral-600 hover:border-neutral-400"
              }`}
            >
              {t.label}{" "}
              <span className={active ? "" : "text-neutral-400"}>
                ({tabCount(t.status)})
              </span>
            </Link>
          );
        })}
      </nav>

      <form
        action="/collection"
        role="search"
        className="mb-6 flex flex-wrap items-end gap-3"
      >
        {query.status && (
          <input type="hidden" name="status" value={query.status} />
        )}
        <label className="text-sm">
          <span className="block text-neutral-400">Search your collection</span>
          <input
            name="q"
            type="search"
            defaultValue={query.q ?? ""}
            maxLength={100}
            placeholder="Title…"
            className="w-56 rounded border border-neutral-700 bg-neutral-900 p-2"
          />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-400">Sort by</span>
          <select
            name="sort"
            defaultValue={query.sort}
            className="rounded border border-neutral-700 bg-neutral-900 p-2"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black">
          Apply
        </button>
        {(query.q || query.sort !== "added") && (
          <Link
            href={href({ status: query.status, sort: "added" })}
            className="py-2 text-sm underline"
          >
            Reset
          </Link>
        )}
      </form>

      {list.items.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 p-6 text-center">
          <p className="text-neutral-300">{emptyMessage}</p>
          {!query.q && (
            <Link
              href="/discover"
              className="mt-4 inline-block rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black"
            >
              Discover movies
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-neutral-400">
            {list.total.toLocaleString()}{" "}
            {list.total === 1 ? "title" : "titles"}
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {list.items.map((item) => (
              <li key={item.tmdbId}>
                <LibraryCard item={item} />
              </li>
            ))}
          </ul>

          {list.totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-6 flex items-center gap-4 text-sm"
            >
              {list.page > 1 && (
                <Link
                  href={href({ ...query, page: list.page - 1 })}
                  className="underline"
                >
                  Previous
                </Link>
              )}
              <span>
                Page {list.page} of {list.totalPages}
              </span>
              {list.page < list.totalPages && (
                <Link
                  href={href({ ...query, page: list.page + 1 })}
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
