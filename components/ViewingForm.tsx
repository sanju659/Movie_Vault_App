"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions/library";

export default function ViewingForm({
  heading,
  today,
  initialDate,
  initialNotes = "",
  submitLabel,
  onSubmit,
  onCancel,
  onSkip,
}: {
  heading: string;
  today: string; // today in the USER'S saved timezone, supplied by the server
  initialDate: string;
  initialNotes?: string;
  submitLabel: string;
  onSubmit: (watchedOn: string, notes: string) => Promise<ActionResult>;
  onCancel: () => void;
  onSkip?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await onSubmit(
        String(f.get("watchedOn") ?? ""),
        String(f.get("notes") ?? ""),
      );
      if (!res.ok) setError(res.message);
    });
  }

  const field = "rounded border border-neutral-700 bg-neutral-900 p-2 text-sm";

  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-3 rounded border border-neutral-800 p-3"
    >
      <p className="font-medium">{heading}</p>
      <label className="block text-sm">
        <span className="block text-neutral-400">Date watched</span>
        <input
          type="date"
          name="watchedOn"
          required
          defaultValue={initialDate}
          max={today}
          className={field}
        />
      </label>
      <label className="block text-sm">
        <span className="block text-neutral-400">Notes (optional)</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          defaultValue={initialNotes}
          placeholder="Where, with whom, how it felt…"
          className={`${field} w-full`}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-black disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {onSkip && (
          <button
            type="button"
            disabled={pending}
            onClick={onSkip}
            className="rounded border border-neutral-600 px-3 py-1.5 text-sm disabled:opacity-60"
          >
            Skip date
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="rounded border border-neutral-600 px-3 py-1.5 text-sm disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
