"use client";

import { useState } from "react";
import type { ViewingEventView } from "@/lib/watch-types";
import type { MediaType } from "@/lib/media";
import { logViewingAction } from "@/server/actions/library";
import ViewingEntry from "./ViewingEntry";
import ViewingForm from "./ViewingForm";

export default function ViewingHistory({
  mediaType,
  tmdbId,
  events,
  today,
}: {
  mediaType: MediaType;
  tmdbId: number;
  events: ViewingEventView[];
  today: string;
}) {
  const [adding, setAdding] = useState(false);
  const isTv = mediaType === "tv";

  return (
    <section
      aria-labelledby="your-viewings"
      className="mt-6 rounded-lg border border-neutral-800 p-4"
    >
      <h2 id="your-viewings" className="font-semibold">
        Your viewings{" "}
        {events.length > 0 && (
          <span className="text-neutral-400">({events.length})</span>
        )}
      </h2>

      {events.length === 0 ? (
        <p className="mt-1 text-sm text-neutral-400">
          No viewings recorded yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-4">
          {events.map((e) => (
            <li key={e.id}>
              <ViewingEntry event={e} today={today} />
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <ViewingForm
          heading={
            isTv
              ? events.length
                ? "Record finishing it again"
                : "When did you finish the series?"
              : events.length
                ? "Record another viewing"
                : "Record a viewing"
          }
          today={today}
          initialDate={today}
          submitLabel="Save viewing"
          onCancel={() => setAdding(false)}
          onSubmit={async (watchedOn, notes) => {
            const res = await logViewingAction(
              mediaType,
              tmdbId,
              watchedOn,
              notes,
            );
            if (res.ok) setAdding(false);
            return res;
          }}
        />
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded border border-neutral-600 px-3 py-1.5 text-sm hover:border-neutral-400"
          >
            {events.length ? "Record another viewing" : "Record a viewing"}
          </button>
          <p className="mt-1 text-xs text-neutral-500">
            {isTv
              ? "For a series, a viewing means you finished the whole series. Recording one marks it as Watched."
              : "Recording a viewing marks this movie as Watched."}
          </p>
        </div>
      )}
    </section>
  );
}
