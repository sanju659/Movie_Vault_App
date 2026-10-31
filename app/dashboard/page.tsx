import { requireUserOrRedirect } from "@/server/auth/session";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const user = await requireUserOrRedirect();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Welcome, {user.displayName}</h1>
      <p className="mt-1 text-sm text-neutral-400">
        {user.email} · {user.timezone}
      </p>
      <LogoutButton />
    </main>
  );
}
