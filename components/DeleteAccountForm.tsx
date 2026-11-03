"use client";

import { useState } from "react";

export default function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: f.get("password") }),
      });
      if (res.ok) {
        // Full reload so no signed-in pages stay in the router cache
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "Something went wrong.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="delete-account"
      className="max-w-lg rounded-lg border border-red-900 p-4"
    >
      <h2 id="delete-account" className="font-semibold text-red-400">
        Delete account
      </h2>
      <p className="mt-1 text-sm text-neutral-300">
        Permanently deletes your account, library, ratings, viewings, and notes.
        This cannot be undone. Consider downloading your data first.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded border border-red-600 px-3 py-1.5 text-sm text-red-400"
        >
          Delete my account…
        </button>
      ) : (
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <label className="block text-sm">
            Confirm with your password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              name="understand"
              type="checkbox"
              required
              className="mt-1"
            />
            I understand this is permanent.
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              disabled={pending}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              className="rounded border border-neutral-600 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
