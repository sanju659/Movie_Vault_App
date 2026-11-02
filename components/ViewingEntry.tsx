"use client";

import { useState, useTransition } from "react";
import type { ViewingEventView } from "@/lib/watch-types";
import { formatWatchedOn } from "@/lib/dates";
import {
  deleteEventAction,
  updateEventAction,
} from "@/app/(app)/movie/[tmdbId]/actions";
import ViewingForm from "./ViewingForm";

export default function ViewingEntry({
  event,
  today,
}: {
  event: ViewingEventView;
  today: string;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function remove() {
    setError("");
    startTransition(async () => {
      const res = await deleteEventAction(event.id);
      if (!res.ok) setError(res.message);
    });
  }

  if (mode === "edit") {
    return (
      <ViewingForm
        heading="Edit viewing"
        today={today}
        initialDate={event.watchedOn}
        initialNotes={event.notes ?? ""}
        submitLabel="Save changes"
        onCancel={() => setMode("view")}
        onSubmit={async (watchedOn, notes) => {
          const res = await updateEventAction(event.id, watchedOn, notes);
          if (res.ok) setMode("view");
          return res;
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{formatWatchedOn(event.watchedOn)}</span>
        {event.isRewatch && (
          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">
            Rewatch
          </span>
        )}
      </div>
      {event.notes && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-300">
          {event.notes}
        </p>
      )}

      {mode === "delete" ? (
        <div
          role="alertdialog"
          aria-label="Confirm deletion"
          className="mt-2 flex flex-wrap items-center gap-3 text-sm"
        >
          <span>Delete this viewing?</span>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="rounded bg-red-600 px-3 py-1 font-medium text-white disabled:opacity-60"
          >
            Yes, delete
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setMode("view")}
            className="rounded border border-neutral-600 px-3 py-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-1 flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("delete")}
            className="text-red-400 underline"
          >
            Delete
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
