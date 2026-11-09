import Link from "next/link";
import type { LibraryItemView, LibraryStatus } from "@/lib/library-types";
import { releaseYear } from "@/lib/tmdb";
import { formatStars } from "@/lib/rating";
import MoviePoster from "./MoviePoster";
import { mediaPath } from "@/lib/media";

const STATUS_LABEL: Record<LibraryStatus, string> = {
  watchlist: "Watchlist",
  watching: "Watching",
  watched: "Watched",
};

export default function LibraryCard({ item }: { item: LibraryItemView }) {
  const year = releaseYear(item.releaseDate);
  return (
    <Link
      href={mediaPath(item.mediaType, item.tmdbId)}
      className="group block focus-visible:outline-2 focus-visible:outline-amber-500"
    >
      <MoviePoster path={item.posterPath} title={item.title} />
      <p className="mt-2 line-clamp-2 text-sm font-medium group-hover:underline">
        {item.title}
      </p>
      <p className="text-xs text-neutral-400">
        {year ?? "Release date unknown"}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-neutral-800 px-1.5 py-0.5">
          {STATUS_LABEL[item.status]}
        </span>
        {item.mediaType === "tv" && (
          <span className="rounded bg-neutral-800 px-1.5 py-0.5">Series</span>
        )}
        {item.personalRating !== null && (
          <span className="text-amber-500">
            <span className="sr-only">Your rating: </span>★{" "}
            {formatStars(item.personalRating)}
          </span>
        )}
      </div>
    </Link>
  );
}
