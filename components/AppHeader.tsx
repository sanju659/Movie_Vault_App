import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 p-3">
        <Link href="/dashboard" className="font-semibold text-amber-500">
          WatchVault
        </Link>
        <nav aria-label="Main" className="flex gap-3 text-sm">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/discover" className="hover:underline">
            Discover
          </Link>
        </nav>
        <form action="/search" role="search" className="ml-auto w-full sm:w-64">
          <input
            name="q"
            type="search"
            aria-label="Search movies"
            placeholder="Search movies…"
            maxLength={100}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
          />
        </form>
        <span className="text-sm text-neutral-400">{userName}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
