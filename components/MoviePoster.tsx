import Image from "next/image";
import { imageUrl, type ImageSize } from "@/lib/tmdb";

export default function MoviePoster({
  path,
  title,
  size = "w342",
  priority = false,
}: {
  path: string | null;
  title: string;
  size?: ImageSize;
  priority?: boolean;
}) {
  const src = imageUrl(path, size);
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
      {src ? (
        <Image
          src={src}
          alt={`Poster for ${title}`}
          fill
          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 45vw"
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center text-sm text-neutral-500">
          No poster
        </div>
      )}
    </div>
  );
}
