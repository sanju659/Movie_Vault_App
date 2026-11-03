import Image from "next/image";
import Link from "next/link";

export default function TmdbAttribution() {
  return (
    <footer className="border-t border-neutral-800 p-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 text-xs text-neutral-400">
        <Image src="/tmdb-logo.svg" alt="TMDB" width={70} height={10} />
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <nav aria-label="Legal" className="ml-auto flex gap-3">
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
