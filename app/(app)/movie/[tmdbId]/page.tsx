import Image from "next/image";
import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/server/auth/session";
import { getMovieDetails } from "@/server/services/tmdb/movies";
import { TmdbError } from "@/server/services/tmdb/client";
import MoviePoster from "@/components/MoviePoster";
import ErrorState from "@/components/ErrorState";
import { formatRuntime, imageUrl, releaseYear } from "@/lib/tmdb";
import type { MovieDetails } from "@/lib/movie-types";
import LibraryPanel from "@/components/LibraryPanel";
import { getItem } from "@/server/services/library";

type Props = { params: Promise<{ tmdbId: string }> };

export default async function MoviePage({ params }: Props) {
  const user = await requireUserOrRedirect();
  const { tmdbId } = await params;
  if (!/^\d{1,9}$/.test(tmdbId) || Number(tmdbId) < 1) notFound();

  let movie: MovieDetails;
  try {
    movie = await getMovieDetails(Number(tmdbId));
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) notFound();
    console.error(err);
    return (
      <ErrorState message="We couldn't load this movie right now. Please try again shortly." />
    );
  }

  const item = await getItem(user.id, movie.tmdbId);
  const year = releaseYear(movie.releaseDate);
  const runtime = formatRuntime(movie.runtimeMinutes);
  const backdrop = imageUrl(movie.backdropPath, "w1280");
  const meta = [
    year,
    runtime,
    movie.genres.map((g) => g.name).join(", ") || null,
  ].filter(Boolean);

  return (
    <article>
      <div className="relative -mx-4 -mt-4 mb-6 h-48 overflow-hidden bg-neutral-900 sm:h-72">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 to-transparent" />
      </div>

      <div className="relative z-10 -mt-24 grid gap-6 sm:grid-cols-[200px_1fr]">
        <div className="relative w-40 sm:w-full">
          <MoviePoster
            path={movie.posterPath}
            title={movie.title}
            size="w500"
            priority
          />
        </div>

        <div>
          <h1 className="text-3xl font-semibold">{movie.title}</h1>
          {movie.originalTitle !== movie.title && (
            <p className="text-sm text-neutral-400">
              Original title: {movie.originalTitle}
            </p>
          )}
          {meta.length > 0 && (
            <p className="mt-1 text-sm text-neutral-300">{meta.join(" · ")}</p>
          )}
          {movie.tagline && (
            <p className="mt-2 italic text-neutral-400">{movie.tagline}</p>
          )}

          <p className="mt-4 text-sm">
            <span className="text-neutral-400">TMDB rating: </span>
            {movie.voteAverage
              ? `${movie.voteAverage.toFixed(1)} / 10 (${movie.voteCount.toLocaleString()} votes)`
              : "Not rated yet"}
          </p>

          <h2 className="mt-6 text-lg font-semibold">Overview</h2>
          <p className="mt-1 text-neutral-200">
            {movie.overview ?? "No overview available."}
          </p>

          {movie.directors.length > 0 && (
            <p className="mt-4 text-sm">
              <span className="text-neutral-400">Directed by: </span>
              {movie.directors.map((d) => d.name).join(", ")}
            </p>
          )}

          <LibraryPanel tmdbId={movie.tmdbId} item={item} />

          {movie.cast.length > 0 && (
            <section aria-labelledby="cast" className="mt-8">
              <h2 id="cast" className="text-lg font-semibold">
                Cast
              </h2>
              <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {movie.cast.map((c) => (
                  <li key={c.id}>
                    {c.name}
                    {c.character && (
                      <span className="text-neutral-400">
                        {" "}
                        as {c.character}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
