import Link from "next/link";
import { requireUserOrRedirect } from "@/server/auth/session";

export default async function DashboardPage() {
  const user = await requireUserOrRedirect();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome, {user.displayName}</h1>
      <p className="mt-1 text-sm text-neutral-400">
        {user.email} · {user.timezone}
      </p>
      <Link
        href="/discover"
        className="mt-6 inline-block rounded bg-amber-500 px-4 py-2 font-medium text-black"
      >
        Discover movies
      </Link>
    </div>
  );
}
