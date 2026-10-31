import Link from "next/link";
import { requireUserOrRedirect } from "@/server/auth/session";
import { searchMovies } from "@/server/services/tmdb/movies";
import MovieGrid from "@/components/MovieGrid";
import ErrorState from "@/components/ErrorState";
import type { SearchResult } from "@/lib/movie-types";

export const metadata = { title: "Search" };

type Props = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: Props) {
  await requireUserOrRedirect();
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const rawPage = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;
  const page = Math.min(
    Math.max(Number.isFinite(rawPage) ? rawPage : 1, 1),
    500,
  );

  let data: SearchResult | null = null;
  let failed = false;
  if (query) {
    try {
      data = await searchMovies(query, page);
    } catch (err) {
      console.error(err);
      failed = true;
    }
  }

  const href = (p: number) =>
    `/search?q=${encodeURIComponent(query)}&page=${p}`;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Search</h1>
      <form action="/search" role="search" className="mb-6 flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={query}
          aria-label="Movie title"
          placeholder="Search by title…"
          maxLength={100}
          className="w-full max-w-md rounded border border-neutral-700 bg-neutral-900 p-2"
        />
        <button className="rounded bg-amber-500 px-4 font-medium text-black">
          Search
        </button>
      </form>

      {!query && (
        <p className="text-neutral-400">Type a title to find a movie.</p>
      )}
      {failed && (
        <ErrorState message="Search is unavailable right now. Please try again in a moment." />
      )}
      {data && data.results.length === 0 && (
        <p className="text-neutral-400">No movies found for “{query}”.</p>
      )}
      {data && data.results.length > 0 && (
        <>
          <p className="mb-4 text-sm text-neutral-400">
            {data.totalResults.toLocaleString()} results for “{query}”
          </p>
          <MovieGrid movies={data.results} />
          <nav
            aria-label="Pagination"
            className="mt-6 flex items-center gap-4 text-sm"
          >
            {data.page > 1 && (
              <Link href={href(data.page - 1)} className="underline">
                Previous
              </Link>
            )}
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            {data.page < data.totalPages && (
              <Link href={href(data.page + 1)} className="underline">
                Next
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
