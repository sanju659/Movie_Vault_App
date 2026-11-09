import Link from "next/link";
import LogoutButton from "./LogoutButton";
import HeaderSearch from "./HeaderSearch";

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
          <Link href="/collection" className="hover:underline">
            My Collection
          </Link>
          <Link href="/history" className="hover:underline">
            History
          </Link>
          <Link href="/settings/account" className="hover:underline">
            Settings
          </Link>
        </nav>
        <HeaderSearch />
        <span className="text-sm text-neutral-400">{userName}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
