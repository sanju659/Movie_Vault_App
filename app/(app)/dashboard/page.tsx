import Link from "next/link";
import { requireUserOrRedirect } from "@/server/auth/session";
import { getCounts } from "@/server/services/library";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUserOrRedirect();
  const counts = await getCounts(user.id);

  const cards = [
    {
      label: "Watched",
      value: counts.watched,
      href: "/collection?status=watched",
    },
    {
      label: "Watching",
      value: counts.watching,
      href: "/collection?status=watching",
    },
    {
      label: "Watchlist",
      value: counts.watchlist,
      href: "/collection?status=watchlist",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome, {user.displayName}</h1>

      {counts.total === 0 ? (
        <div className="mt-6 rounded-lg border border-neutral-800 p-6">
          <p className="text-neutral-300">
            Your collection is empty. Find a movie and add it to your watchlist
            to get started.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-block rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black"
          >
            Discover movies
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className="block rounded-lg border border-neutral-800 p-4 hover:border-amber-500"
              >
                <span className="block text-3xl font-semibold">{c.value}</span>
                <span className="text-sm text-neutral-400">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
