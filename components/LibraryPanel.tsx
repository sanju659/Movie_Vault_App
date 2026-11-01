"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import type { LibraryItemView, LibraryStatus } from "@/lib/library-types";
import { formatStars } from "@/lib/rating";
import {
  removeAction,
  setRatingAction,
  setStatusAction,
  type ActionResult,
} from "@/app/(app)/movie/[tmdbId]/actions";

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
  tmdbId,
  item,
}: {
  tmdbId: number;
  item: LibraryItemView | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  // Shows the new rating instantly; reverts automatically if the action fails
  const [rating, setOptimisticRating] = useOptimistic(
    item?.personalRating ?? null,
  );

  function run(fn: () => Promise<ActionResult>, optimistic?: () => void) {
    setError("");
    startTransition(async () => {
      optimistic?.();
      const res = await fn();
      if (!res.ok) setError(res.message);
      else setConfirming(false);
    });
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
              onClick={() => run(() => setStatusAction(tmdbId, o.value))}
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

      {!item && (
        <p className="mt-2 text-sm text-neutral-400">
          Not in your library yet. Pick a status to add it.
        </p>
      )}
      {item?.status === "watched" && (
        <p className="mt-2 text-sm text-neutral-400">
          Recording the date you watched it comes in the next phase.
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
                () => setRatingAction(tmdbId, v),
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
                  () => setRatingAction(tmdbId, null),
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
            Add this movie to your library to rate it.
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
              className="flex flex-wrap items-center gap-3 text-sm"
            >
              <span>
                Remove this movie from your library? Your rating will be lost.
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => removeAction(tmdbId))}
                className="rounded bg-red-600 px-3 py-1 font-medium text-white disabled:opacity-60"
              >
                Yes, remove
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="rounded border border-neutral-600 px-3 py-1"
              >
                Cancel
              </button>
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
