import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold">WatchVault</h1>
      <p className="text-neutral-400">Your Personal Cinema Diary.</p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded bg-amber-500 px-4 py-2 font-medium text-black"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded border border-neutral-600 px-4 py-2"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
