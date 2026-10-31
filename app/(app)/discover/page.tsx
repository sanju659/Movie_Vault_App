import { requireUserOrRedirect } from "@/server/auth/session";
import {
  getPopular,
  getTopRated,
  getTrending,
  getUpcoming,
} from "@/server/services/tmdb/movies";
import MovieRow from "@/components/MovieRow";
import ErrorState from "@/components/ErrorState";

export const metadata = { title: "Discover" };

const sections = [
  { title: "Trending this week", load: getTrending },
  { title: "Popular", load: getPopular },
  { title: "Top rated", load: getTopRated },
  { title: "Upcoming", load: getUpcoming },
];

export default async function DiscoverPage() {
  await requireUserOrRedirect();
  // allSettled: one failing list must not take down the whole page
  const results = await Promise.allSettled(sections.map((s) => s.load()));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Discover</h1>
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
