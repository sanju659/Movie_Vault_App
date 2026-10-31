import Image from "next/image";

export default function TmdbAttribution() {
  return (
    <footer className="border-t border-neutral-800 p-4">
      <div className="mx-auto flex max-w-6xl items-center gap-3 text-xs text-neutral-400">
        <Image src="/tmdb-logo.svg" alt="TMDB" width={70} height={10} />
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </div>
    </footer>
  );
}
