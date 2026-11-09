import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/server/auth/session";
import { getPerson } from "@/server/services/tmdb/movies";
import { TmdbError } from "@/server/services/tmdb/client";
import PersonPhoto from "@/components/PersonPhoto";
import MovieGrid from "@/components/MovieGrid";
import ErrorState from "@/components/ErrorState";
import { formatWatchedOn } from "@/lib/dates";
import type { MovieSummary, PersonDetails } from "@/lib/movie-types";
import PageNumbers from "@/components/PageNumbers";

export const metadata = { title: "Person" };

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Pages = { acted: number; directed: number };

// A bad value in the URL falls back to page 1 instead of erroring
function pageParam(v: string | string[] | undefined) {
  const n = typeof v === "string" ? parseInt(v, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 1000) : 1;
}

function href(id: string, pages: Pages, hash: string) {
  const sp = new URLSearchParams();
  if (pages.acted > 1) sp.set("actedPage", String(pages.acted));
  if (pages.directed > 1) sp.set("directedPage", String(pages.directed));
  const s = sp.toString();
  return `/person/${id}${s ? `?${s}` : ""}#${hash}`;
}

export default async function PersonPage({ params, searchParams }: Props) {
  await requireUserOrRedirect();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id) || Number(id) < 1) notFound();

  const sp = await searchParams;
  const requested: Pages = {
    acted: pageParam(sp.actedPage),
    directed: pageParam(sp.directedPage),
  };

  let person: PersonDetails;
  try {
    person = await getPerson(Number(id));
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) notFound();
    console.error(err);
    return (
      <ErrorState message="We couldn't load this person right now. Please try again shortly." />
    );
  }

  type Section = { key: keyof Pages; title: string; all: MovieSummary[] };
  const sections: Section[] = [
    { key: "acted", title: "Acted in", all: person.acted },
    { key: "directed", title: "Directed", all: person.directed },
  ];
  if (person.knownForDepartment === "Directing") sections.reverse(); // lead with what they're known for

  // Clamp each page to what exists (a stale link past the last page shows the last page)
  const totalPagesOf = (n: number) => Math.max(1, Math.ceil(n / PAGE_SIZE));
  const current: Pages = {
    acted: Math.min(requested.acted, totalPagesOf(person.acted.length)),
    directed: Math.min(
      requested.directed,
      totalPagesOf(person.directed.length),
    ),
  };

  const birthday =
    person.birthday && /^\d{4}-\d{2}-\d{2}$/.test(person.birthday)
      ? formatWatchedOn(person.birthday)
      : null;
  const facts = [
    person.knownForDepartment,
    birthday && `Born ${birthday}`,
    person.placeOfBirth,
  ].filter(Boolean);
  const hasCredits = sections.some((s) => s.all.length > 0);

  return (
    <article>
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div className="w-40 sm:w-full">
          <PersonPhoto
            path={person.profilePath}
            name={person.name}
            size="h632"
            priority
          />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">{person.name}</h1>
          {facts.length > 0 && (
            <p className="mt-1 text-sm text-neutral-300">{facts.join(" · ")}</p>
          )}
          {person.biography && (
            <details className="mt-4 text-sm text-neutral-300">
              <summary className="cursor-pointer text-neutral-100">
                Biography
              </summary>
              <p className="mt-2 whitespace-pre-line">{person.biography}</p>
            </details>
          )}
        </div>
      </div>

      {!hasCredits && (
        <p className="mt-8 text-neutral-400">
          No movie credits found for {person.name}. TV credits aren’t shown yet.
        </p>
      )}

      {sections.map((s) => {
        if (s.all.length === 0) return null;
        const page = current[s.key];
        const totalPages = totalPagesOf(s.all.length);
        const start = (page - 1) * PAGE_SIZE;
        const slice = s.all.slice(start, start + PAGE_SIZE);
        const link = (p: number) => href(id, { ...current, [s.key]: p }, s.key);

        return (
          <section
            key={s.key}
            id={s.key}
            aria-labelledby={`${s.key}-heading`}
            className="mt-8 scroll-mt-4"
          >
            <h2 id={`${s.key}-heading`} className="text-lg font-semibold">
              {s.title}{" "}
              <span className="text-neutral-400">({s.all.length})</span>
            </h2>
            {totalPages > 1 && (
              <p className="mb-3 text-sm text-neutral-400">
                Showing {start + 1}–{start + slice.length} of {s.all.length}
              </p>
            )}
            <div className={totalPages > 1 ? "" : "mt-3"}>
              <MovieGrid movies={slice} />
            </div>

            <PageNumbers
              label={`${s.title} pagination`}
              current={page}
              total={totalPages}
              hrefFor={link}
            />
          </section>
        );
      })}
    </article>
  );
}
