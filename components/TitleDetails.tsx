import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/server/auth/session";
import { getMediaDetails } from "@/server/services/tmdb/movies";
import { TmdbError } from "@/server/services/tmdb/client";
import { getItem } from "@/server/services/library";
import { listEventsForTitle } from "@/server/services/watchEvents";
import MoviePoster from "@/components/MoviePoster";
import ErrorState from "@/components/ErrorState";
import LibraryPanel from "@/components/LibraryPanel";
import ViewingHistory from "@/components/ViewingHistory";
import { formatRuntime, imageUrl, releaseYear } from "@/lib/tmdb";
import { todayIn } from "@/lib/dates";
import type { MediaType } from "@/lib/media";
import type { MovieDetails } from "@/lib/movie-types";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function TitleDetails({
  mediaType,
  rawId,
}: {
  mediaType: MediaType;
  rawId: string;
}) {
  const user = await requireUserOrRedirect();
  if (!/^\d{1,9}$/.test(rawId) || Number(rawId) < 1) notFound();
  const tmdbId = Number(rawId);

  let movie: MovieDetails;
  try {
    movie = await getMediaDetails(mediaType, tmdbId);
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) notFound();
    console.error(err);
    return (
      <ErrorState message="We couldn't load this title right now. Please try again shortly." />
    );
  }

  const [item, events] = await Promise.all([
    getItem(user.id, mediaType, tmdbId),
    listEventsForTitle(user.id, mediaType, tmdbId),
  ]);
  const today = todayIn(user.timezone);

  const isTv = mediaType === "tv";
  const year = releaseYear(movie.releaseDate);
  const backdrop = imageUrl(movie.backdropPath, "w1280");
  const episodeRuntime = formatRuntime(movie.episodeRuntimeMinutes);
  const meta = [
    year,
    isTv ? "TV series" : null,
    isTv && movie.numberOfSeasons
      ? plural(movie.numberOfSeasons, "season")
      : null,
    isTv && movie.numberOfEpisodes
      ? plural(movie.numberOfEpisodes, "episode")
      : null,
    isTv
      ? episodeRuntime
        ? `${episodeRuntime} per episode`
        : null
      : formatRuntime(movie.runtimeMinutes),
    movie.genres.map((g) => g.name).join(", ") || null,
  ].filter(Boolean);

  const makers = isTv ? (movie.creators ?? []) : movie.directors;

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

          {makers.length > 0 && (
            <p className="mt-4 text-sm">
              <span className="text-neutral-400">
                {isTv ? "Created by: " : "Directed by: "}
              </span>
              {makers.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ", "}
                  <Link
                    href={`/person/${d.id}`}
                    className="underline hover:text-amber-500"
                  >
                    {d.name}
                  </Link>
                </span>
              ))}
            </p>
          )}

          <LibraryPanel
            mediaType={mediaType}
            tmdbId={tmdbId}
            item={item}
            viewingCount={events.length}
            today={today}
          />
          <ViewingHistory
            mediaType={mediaType}
            tmdbId={tmdbId}
            events={events}
            today={today}
          />

          {movie.cast.length > 0 && (
            <section aria-labelledby="cast" className="mt-8">
              <h2 id="cast" className="text-lg font-semibold">
                Cast
              </h2>
              <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {movie.cast.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/person/${c.id}`}
                      className="underline hover:text-amber-500"
                    >
                      {c.name}
                    </Link>
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
