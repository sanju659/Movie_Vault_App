import type { MovieSummary } from "@/lib/movie-types";
import MovieCard from "./MovieCard";

export default function MovieRow({
  title,
  movies,
}: {
  title: string;
  movies: MovieSummary[];
}) {
  return (
    <section aria-labelledby={`row-${title}`} className="mb-8">
      <h2 id={`row-${title}`} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-2">
        {movies.map((m) => (
          <li key={m.tmdbId} className="w-36 shrink-0">
            <MovieCard movie={m} />
          </li>
        ))}
      </ul>
    </section>
  );
}
