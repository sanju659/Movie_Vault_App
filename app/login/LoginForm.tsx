"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setMessage("");
    setPending(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: f.get("email"),
        password: f.get("password"),
      }),
    });
    setPending(false);

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setMessage(data?.error?.message ?? "Something went wrong.");
  }

  const field = "w-full rounded border border-neutral-700 bg-neutral-900 p-2";

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-semibold">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={field}
          />
        </label>
        <label className="block">
          Password
          <input
            name="password"
            type={show ? "text" : "password"}
            required
            autoComplete="current-password"
            className={field}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />{" "}
          Show password
        </label>
        {message && (
          <p role="alert" className="text-sm text-red-400">
            {message}
          </p>
        )}
        <button
          disabled={pending}
          className="w-full rounded bg-amber-500 p-2 font-medium text-black disabled:opacity-60"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        New here?{" "}
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
