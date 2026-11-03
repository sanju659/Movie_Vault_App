"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; // capture before awaiting
    const f = new FormData(form);
    setErrors({});
    setMessage("");
    setSuccess(false);

    if (f.get("newPassword") !== f.get("confirmPassword")) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: f.get("currentPassword"),
          newPassword: f.get("newPassword"),
        }),
      });
      if (res.ok) {
        form.reset();
        setSuccess(true);
        return;
      }
      const data = await res.json().catch(() => null);
      setErrors(data?.error?.fieldErrors ?? {});
      setMessage(data?.error?.message ?? "Something went wrong.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const type = show ? "text" : "password";
  const field = "w-full rounded border border-neutral-700 bg-neutral-900 p-2";
  const err = (k: string) =>
    errors[k] && (
      <p role="alert" className="text-sm text-red-400">
        {errors[k]}
      </p>
    );

  return (
    <section
      aria-labelledby="change-password"
      className="max-w-sm rounded-lg border border-neutral-800 p-4"
    >
      <h2 id="change-password" className="font-semibold">
        Change password
      </h2>
      <p className="mt-1 text-sm text-neutral-400">
        This signs you out of every other device. You stay signed in here.
      </p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3" noValidate>
        <label className="block text-sm">
          Current password
          <input
            name="currentPassword"
            type={type}
            required
            autoComplete="current-password"
            className={field}
          />
        </label>
        {err("currentPassword")}
        <label className="block text-sm">
          New password (at least 10 characters)
          <input
            name="newPassword"
            type={type}
            required
            autoComplete="new-password"
            className={field}
          />
        </label>
        {err("newPassword")}
        <label className="block text-sm">
          Confirm new password
          <input
            name="confirmPassword"
            type={type}
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
          />{" "}
          Show passwords
        </label>
        {message && (
          <p role="alert" className="text-sm text-red-400">
            {message}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-green-400">
            Password updated.
          </p>
        )}
        <button
          disabled={pending}
          className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
