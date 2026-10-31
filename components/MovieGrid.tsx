import type { MovieSummary } from "@/lib/movie-types";
import MovieCard from "./MovieCard";

export default function MovieGrid({ movies }: { movies: MovieSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {movies.map((m) => (
        <li key={m.tmdbId}>
          <MovieCard movie={m} />
        </li>
      ))}
    </ul>
  );
}
