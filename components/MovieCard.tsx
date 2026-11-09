import Link from "next/link";
import type { MovieSummary } from "@/lib/movie-types";
import { releaseYear } from "@/lib/tmdb";
import MoviePoster from "./MoviePoster";

export default function MovieCard({ movie }: { movie: MovieSummary }) {
  const year = releaseYear(movie.releaseDate);
  return (
    <Link
      href={`/movie/${movie.tmdbId}`}
      aria-label={year ? `${movie.title} (${year})` : movie.title}
      className="group block focus-visible:outline-2 focus-visible:outline-amber-500"
    >
      <MoviePoster path={movie.posterPath} title={movie.title} />
      <p className="mt-2 line-clamp-2 text-sm font-medium group-hover:underline">
        {movie.title}
      </p>
      <p className="text-xs text-neutral-300">
        {year ?? "Release date unknown"}
      </p>
    </Link>
  );
}
