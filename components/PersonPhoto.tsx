import Image from "next/image";
import { imageUrl, type ImageSize } from "@/lib/tmdb";

export default function PersonPhoto({
  path,
  name,
  size = "w185",
  priority = false,
}: {
  path: string | null;
  name: string;
  size?: ImageSize;
  priority?: boolean;
}) {
  const src = imageUrl(path, size);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
      {src ? (
        <Image
          src={src}
          alt={`Photo of ${name}`}
          fill
          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 45vw"
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div
          aria-hidden
          className="flex h-full items-center justify-center text-3xl text-neutral-500"
        >
          {initials}
        </div>
      )}
    </div>
  );
}
