import Link from "next/link";
import { requireUserOrRedirect } from "@/server/auth/session";
import {
  getPopular,
  getPopularTv,
  getTopRated,
  getTopRatedTv,
  getTrending,
  getTrendingTv,
  getUpcoming,
} from "@/server/services/tmdb/movies";
import MovieRow from "@/components/MovieRow";
import ErrorState from "@/components/ErrorState";

export const metadata = { title: "Discover" };

type Props = { searchParams: Promise<{ type?: string | string[] }> };

const SECTIONS = {
  movies: [
    { title: "Trending this week", load: getTrending },
    { title: "Popular", load: getPopular },
    { title: "Top rated", load: getTopRated },
    { title: "Upcoming", load: getUpcoming },
  ],
  tv: [
    { title: "Trending series this week", load: getTrendingTv },
    { title: "Popular series", load: getPopularTv },
    { title: "Top rated series", load: getTopRatedTv },
  ],
};

export default async function DiscoverPage({ searchParams }: Props) {
  await requireUserOrRedirect();
  const sp = await searchParams;
  const type = sp.type === "tv" ? "tv" : "movies";
  const sections = SECTIONS[type];

  // allSettled: one failing list must not take down the whole page
  const results = await Promise.allSettled(sections.map((s) => s.load()));

  const tabs = [
    { type: "movies", label: "Movies", href: "/discover" },
    { type: "tv", label: "TV series", href: "/discover?type=tv" },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Discover</h1>

      <nav aria-label="Discover type" className="mb-6 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.type}
            href={t.href}
            aria-current={t.type === type ? "page" : undefined}
            className={`rounded border px-3 py-1.5 text-sm ${
              t.type === type
                ? "border-amber-500 bg-amber-500 font-medium text-black"
                : "border-neutral-600 hover:border-neutral-400"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {sections.map((s, i) => {
        const r = results[i];
        if (r.status === "rejected") {
          return (
            <ErrorState
              key={s.title}
              message={`Couldn't load “${s.title}” right now.`}
            />
          );
        }
        return r.value.length ? (
          <MovieRow key={s.title} title={s.title} movies={r.value} />
        ) : null;
      })}
    </div>
  );
}
