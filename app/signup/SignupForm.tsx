"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErrors({});
    setMessage("");

    if (f.get("password") !== f.get("confirmPassword")) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setPending(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: f.get("displayName"),
        email: f.get("email"),
        password: f.get("password"),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        acceptedTerms: f.get("acceptedTerms") === "on",
      }),
    });
    setPending(false);

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setErrors(data?.error?.fieldErrors ?? {});
    setMessage(data?.error?.message ?? "Something went wrong.");
  }

  const field = "w-full rounded border border-neutral-700 bg-neutral-900 p-2";
  const err = (k: string) =>
    errors[k] && (
      <p role="alert" className="text-sm text-red-400">
        {errors[k]}
      </p>
    );

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-semibold">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <label className="block">
          Display name
          <input name="displayName" required className={field} />
        </label>
        {err("displayName")}
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
        {err("email")}
        <label className="block">
          Password
          <input
            name="password"
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            className={field}
          />
        </label>
        {err("password")}
        <label className="block">
          Confirm password
          <input
            name="confirmPassword"
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            className={field}
          />
        </label>
        {err("confirmPassword")}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          Show password
        </label>
        <label className="flex items-center gap-2">
          <input name="acceptedTerms" type="checkbox" /> I accept the terms and
          privacy policy
        </label>
        {err("acceptedTerms")}
        {message && (
          <p role="alert" className="text-sm text-red-400">
            {message}
          </p>
        )}
        <button
          disabled={pending}
          className="w-full rounded bg-amber-500 p-2 font-medium text-black disabled:opacity-60"
        >
          {pending ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
