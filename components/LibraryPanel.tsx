"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import type { LibraryItemView, LibraryStatus } from "@/lib/library-types";
import { MEDIA_NOUN, WATCHED_QUESTION, type MediaType } from "@/lib/media";
import { formatStars } from "@/lib/rating";
import {
  logViewingAction,
  removeAction,
  setRatingAction,
  setStatusAction,
  type ActionResult,
} from "@/server/actions/library";
import ViewingForm from "./ViewingForm";

const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: "watchlist", label: "Watchlist" },
  { value: "watching", label: "Watching" },
  { value: "watched", label: "Watched" },
];

function RatingInput({
  value,
  disabled,
  onChange,
}: {
  value: number | null; // integer 1-10 (half stars)
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = hover ?? value ?? 0;
  const tabStop = value ?? 1; // roving tabindex: one tab stop for the whole control

  // Arrow keys move focus; Space/Enter commits (avoids a server call per keypress)
  function onKeyDown(e: React.KeyboardEvent, current: number) {
    let next = current;
    if (e.key === "ArrowRight" || e.key === "ArrowUp")
      next = Math.min(10, current + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      next = Math.max(1, current - 1);
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = 10;
    else return;
    e.preventDefault();
    refs.current[next - 1]?.focus();
    setHover(null);
  }

  return (
    <div
      role="group"
      aria-label="Your rating"
      className="inline-flex"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = shown >= star * 2 ? 100 : shown === star * 2 - 1 ? 50 : 0;
        return (
          <span
            key={star}
            className="relative inline-block text-3xl leading-none"
          >
            <span aria-hidden className="text-neutral-700">
              ★
            </span>
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full overflow-hidden whitespace-nowrap text-amber-500"
              style={{ width: `${fill}%` }}
            >
              ★
            </span>
            {[star * 2 - 1, star * 2].map((v) => (
              <button
                key={v}
                type="button"
                ref={(el) => {
                  refs.current[v - 1] = el;
                }}
                disabled={disabled}
                aria-label={`${v / 2} ${v === 2 ? "star" : "stars"}`}
                aria-pressed={value === v}
                tabIndex={v === tabStop ? 0 : -1}
                onClick={() => onChange(v)}
                onMouseEnter={() => setHover(v)}
                onFocus={() => setHover(null)}
                onKeyDown={(e) => onKeyDown(e, v)}
                className={`absolute top-0 h-full w-1/2 focus-visible:outline-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed ${
                  v % 2 ? "left-0" : "right-0"
                }`}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}

export default function LibraryPanel({
  mediaType,
  tmdbId,
  item,
  viewingCount,
  today,
}: {
  mediaType: MediaType;
  tmdbId: number;
  item: LibraryItemView | null;
  viewingCount: number;
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [prompting, setPrompting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Shows the new rating instantly; reverts automatically if the action fails
  const [rating, setOptimisticRating] = useOptimistic(
    item?.personalRating ?? null,
  );
  const noun = MEDIA_NOUN[mediaType];

  function run(fn: () => Promise<ActionResult>, optimistic?: () => void) {
    setError("");
    startTransition(async () => {
      optimistic?.();
      const res = await fn();
      if (!res.ok) setError(res.message);
      else {
        setConfirming(false);
        setPrompting(false);
      }
    });
  }

  function chooseStatus(status: LibraryStatus) {
    setError("");
    if (status === "watched") {
      setPrompting(true); // rule 3c: ask for the date first
      return;
    }
    setPrompting(false);
    run(() => setStatusAction(mediaType, tmdbId, status));
  }

  return (
    <section
      aria-labelledby="your-library"
      className="mt-8 rounded-lg border border-neutral-800 p-4"
    >
      <h2 id="your-library" className="font-semibold">
        Your library
      </h2>

      <div
        role="group"
        aria-label="Library status"
        className="mt-3 flex flex-wrap gap-2"
      >
        {STATUS_OPTIONS.map((o) => {
          const active = item?.status === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              disabled={pending || active}
              onClick={() => chooseStatus(o.value)}
              className={`rounded border px-3 py-1.5 text-sm disabled:cursor-default ${
                active
                  ? "border-amber-500 bg-amber-500 font-medium text-black"
                  : "border-neutral-600 hover:border-neutral-400 disabled:opacity-60"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {prompting && (
        <ViewingForm
          heading={WATCHED_QUESTION[mediaType]}
          today={today}
          initialDate={today}
          submitLabel="Save viewing"
          onCancel={() => setPrompting(false)}
          onSkip={() =>
            run(() => setStatusAction(mediaType, tmdbId, "watched"))
          }
          onSubmit={async (watchedOn, notes) => {
            const res = await logViewingAction(
              mediaType,
              tmdbId,
              watchedOn,
              notes,
            );
            if (res.ok) setPrompting(false);
            return res;
          }}
        />
      )}

      {!item && !prompting && (
        <p className="mt-2 text-sm text-neutral-400">
          Not in your library yet. Pick a status to add it.
        </p>
      )}
      {item?.status === "watched" && viewingCount === 0 && (
        <p className="mt-2 text-sm text-neutral-400">
          No viewing date recorded. You can add one below.
        </p>
      )}

      <div className="mt-5">
        <p className="text-sm text-neutral-400">
          Your rating:{" "}
          <span className="text-neutral-100">{formatStars(rating)}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <RatingInput
            value={rating}
            disabled={!item || pending}
            onChange={(v) =>
              run(
                () => setRatingAction(mediaType, tmdbId, v),
                () => setOptimisticRating(v),
              )
            }
          />
          {item && rating !== null && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => setRatingAction(mediaType, tmdbId, null),
                  () => setOptimisticRating(null),
                )
              }
              className="text-sm underline disabled:opacity-60"
            >
              Clear rating
            </button>
          )}
        </div>
        {!item && (
          <p className="mt-1 text-sm text-neutral-500">
            Add this {noun} to your library to rate it.
          </p>
        )}
      </div>

      {item && (
        <div className="mt-5 border-t border-neutral-800 pt-4">
          {!confirming ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(true)}
              className="text-sm text-red-400 underline"
            >
              Remove from library
            </button>
          ) : (
            <div
              role="alertdialog"
              aria-label="Confirm removal"
              className="space-y-3 text-sm"
            >
              <p>
                Remove this {noun} from your library? Your rating will be lost.
              </p>
              {viewingCount > 0 && (
                <p className="text-neutral-400">
                  You have {viewingCount} recorded{" "}
                  {viewingCount === 1 ? "viewing" : "viewings"} of this {noun}.
                  Your viewing history is kept unless you choose to delete it.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() => removeAction(mediaType, tmdbId, false))
                  }
                  className="rounded bg-red-600 px-3 py-1 font-medium text-white disabled:opacity-60"
                >
                  {viewingCount > 0
                    ? "Remove from library only"
                    : "Yes, remove"}
                </button>
                {viewingCount > 0 && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => removeAction(mediaType, tmdbId, true))
                    }
                    className="rounded border border-red-600 px-3 py-1 font-medium text-red-400 disabled:opacity-60"
                  >
                    Remove and delete {viewingCount}{" "}
                    {viewingCount === 1 ? "viewing" : "viewings"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className="rounded border border-neutral-600 px-3 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
