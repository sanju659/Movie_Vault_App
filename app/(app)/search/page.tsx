import Link from "next/link";
import { requireUserOrRedirect } from "@/server/auth/session";
import {
  discoverMovies,
  searchMovies,
  searchPeople,
} from "@/server/services/tmdb/movies";
import { parseSearchQuery, type SearchQuery } from "@/server/validation/search";
import MovieGrid from "@/components/MovieGrid";
import PersonCard from "@/components/PersonCard";
import ErrorState from "@/components/ErrorState";
import { GENRE_NAMES } from "@/lib/genres";
import { LANGUAGES } from "@/lib/languages";
import {
  DISCOVER_SORTS,
  MIN_RATING_OPTIONS,
  MIN_YEAR,
  SORT_LABELS,
  maxYear,
  splitTrailingYear,
} from "@/lib/search";
import type { PersonSearchResult, SearchResult } from "@/lib/movie-types";

export const metadata = { title: "Search" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const GENRES = Object.entries(GENRE_NAMES)
  .map(([id, name]) => ({ id: Number(id), name }))
  .sort((a, b) => a.name.localeCompare(b.name));

function href(p: Partial<SearchQuery>) {
  const sp = new URLSearchParams();
  if (p.type && p.type !== "movies") sp.set("type", p.type);
  if (p.q) sp.set("q", p.q);
  if (p.year) sp.set("year", String(p.year));
  if (p.genre) sp.set("genre", String(p.genre));
  if (p.rating) sp.set("rating", String(p.rating));
  if (p.lang) sp.set("lang", p.lang);
  if (p.sort && p.sort !== "popularity") sp.set("sort", p.sort);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return s ? `/search?${s}` : "/search";
}

const control = "rounded border border-neutral-700 bg-neutral-900 p-2";

export default async function SearchPage({ searchParams }: Props) {
  await requireUserOrRedirect();
  const query = parseSearchQuery(await searchParams);
  const { type, q, year, genre, rating, lang, sort, page } = query;

  const isMovies = type === "movies";
  const hasBrowseFilters = Boolean(
    genre || rating || lang || sort !== "popularity",
  );
  const browsing = isMovies && !q && Boolean(year || hasBrowseFilters);
  const ignoredFilters = isMovies && Boolean(q) && hasBrowseFilters;

  let movies: SearchResult | null = null;
  let people: PersonSearchResult | null = null;
  let note: string | null = null;
  let failed = false;

  try {
    if (!isMovies) {
      if (q) people = await searchPeople(q, page);
    } else if (q) {
      movies = await searchMovies(q, page, year);
      // "alien 1979": if the full text finds nothing, retry as title + year
      if (movies.results.length === 0 && !year) {
        const split = splitTrailingYear(q);
        if (split) {
          const retry = await searchMovies(split.title, page, split.year);
          if (retry.results.length > 0) {
            movies = retry;
            note = `No exact matches for “${q}”. Showing “${split.title}” released in ${split.year}.`;
          }
        }
      }
    } else if (browsing) {
      movies = await discoverMovies({
        genre,
        year,
        minRating: rating,
        language: lang,
        sort,
        page,
      });
    }
  } catch (err) {
    console.error(err);
    failed = true;
  }

  const paging = movies ?? people;
  const canReset = Boolean(q || year || hasBrowseFilters);
  const nothingYet = !q && !browsing;
  const empty = !failed && paging && paging.results.length === 0;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Search</h1>

      <nav aria-label="Search type" className="mb-4 flex gap-2">
        {(["movies", "people"] as const).map((t) => (
          <Link
            key={t}
            href={href({ type: t, q })}
            aria-current={t === type ? "page" : undefined}
            className={`rounded border px-3 py-1.5 text-sm ${
              t === type
                ? "border-amber-500 bg-amber-500 font-medium text-black"
                : "border-neutral-600 hover:border-neutral-400"
            }`}
          >
            {t === "movies" ? "Movies" : "People (actors & directors)"}
          </Link>
        ))}
      </nav>

      <form
        action="/search"
        role="search"
        className="mb-4 flex flex-wrap items-end gap-3"
      >
        {!isMovies && <input type="hidden" name="type" value="people" />}

        <label className="text-sm">
          <span className="block text-neutral-400">
            {isMovies ? "Movie title" : "Actor or director"}
          </span>
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            maxLength={100}
            placeholder={isMovies ? "Search by title…" : "Search by name…"}
            className={`${control} w-60`}
          />
        </label>

        {isMovies && (
          <>
            <label className="text-sm">
              <span className="block text-neutral-400">Release year</span>
              <input
                name="year"
                type="number"
                inputMode="numeric"
                min={MIN_YEAR}
                max={maxYear()}
                defaultValue={year ?? ""}
                placeholder="Any"
                className={`${control} w-24`}
              />
            </label>

            <label className="text-sm">
              <span className="block text-neutral-400">Genre</span>
              <select
                name="genre"
                defaultValue={genre ?? ""}
                className={control}
              >
                <option value="">Any genre</option>
                {GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-neutral-400">
                Minimum TMDB rating
              </span>
              <select
                name="rating"
                defaultValue={rating ?? ""}
                className={control}
              >
                <option value="">Any rating</option>
                {MIN_RATING_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}+ / 10
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-neutral-400">Original language</span>
              <select name="lang" defaultValue={lang ?? ""} className={control}>
                <option value="">Any language</option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-neutral-400">Sort by</span>
              <select name="sort" defaultValue={sort} className={control}>
                {DISCOVER_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <button className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black">
          Search
        </button>
        {canReset && (
          <Link href={href({ type })} className="py-2 text-sm underline">
            Reset
          </Link>
        )}
      </form>

      {isMovies && (
        <p className="mb-6 text-xs text-neutral-500">
          Year works with a title. Genre, rating, language and sort apply when
          the title is empty, because TMDB can’t combine them with a title
          search.
        </p>
      )}

      {ignoredFilters && (
        <p role="status" className="mb-4 text-sm text-amber-400">
          Genre, rating, language and sort were ignored because a title was
          entered. Clear the title to browse with them.
        </p>
      )}
      {note && (
        <p role="status" className="mb-4 text-sm text-amber-400">
          {note}
        </p>
      )}

      {nothingYet && !failed && (
        <p className="text-neutral-400">
          {isMovies
            ? "Type a title, or pick a year, genre or other filter to browse movies."
            : "Type the name of an actor or director."}
        </p>
      )}

      {failed && (
        <ErrorState message="Search is unavailable right now. Please try again in a moment." />
      )}

      {empty && (
        <div className="rounded-lg border border-neutral-800 p-6">
          <p className="text-neutral-300">
            {q
              ? `No ${isMovies ? "movies" : "people"} found for “${q}”${year ? ` in ${year}` : ""}.`
              : "No movies match those filters."}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-400">
            <li>Check the spelling, or try fewer words.</li>
            {year && (
              <li>
                Remove the year, or check it. TMDB uses the original release
                year.
              </li>
            )}
            {isMovies && (
              <li>Looking for an actor or director? Use the People tab.</li>
            )}
            {isMovies && (
              <li>
                TV series (for example Money Heist) aren’t supported yet. Movies
                only for now.
              </li>
            )}
          </ul>
        </div>
      )}

      {movies && movies.results.length > 0 && (
        <>
          <p className="mb-4 text-sm text-neutral-400">
            {q
              ? `${movies.totalResults.toLocaleString()} results for “${q}”`
              : `${movies.totalResults.toLocaleString()} movies match your filters`}
          </p>
          <MovieGrid movies={movies.results} />
        </>
      )}

      {people && people.results.length > 0 && (
        <>
          <p className="mb-4 text-sm text-neutral-400">
            {people.totalResults.toLocaleString()} people match “{q}”
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {people.results.map((p) => (
              <li key={p.id}>
                <PersonCard person={p} />
              </li>
            ))}
          </ul>
        </>
      )}

      {paging && paging.results.length > 0 && paging.totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center gap-4 text-sm"
        >
          {paging.page > 1 && (
            <Link
              href={href({ ...query, page: paging.page - 1 })}
              className="underline"
            >
              Previous
            </Link>
          )}
          <span>
            Page {paging.page} of {paging.totalPages}
          </span>
          {paging.page < paging.totalPages && (
            <Link
              href={href({ ...query, page: paging.page + 1 })}
              className="underline"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
