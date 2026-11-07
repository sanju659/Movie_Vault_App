"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TimezoneForm({
  current,
  zones,
}: {
  current: string;
  zones: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [detected, setDetected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  // The saved or detected zone may be missing from the list (for example "UTC" or an older alias)
  const options = [
    ...new Set([...zones, current, ...(detected ? [detected] : [])]),
  ].sort();

  function useDeviceZone() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDetected(tz);
    setValue(tz);
    setSuccess(false);
    setMessage("");
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);
    setPending(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: value }),
      });
      if (res.ok) {
        setSuccess(true);
        router.refresh(); // re-render server components with the new "today"
        return;
      }
      const data = await res.json().catch(() => null);
      setMessage(
        data?.error?.fieldErrors?.timezone ??
          data?.error?.message ??
          "Something went wrong.",
      );
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="timezone"
      className="mb-8 max-w-sm rounded-lg border border-neutral-800 p-4"
    >
      <h2 id="timezone" className="font-semibold">
        Timezone
      </h2>
      <p className="mt-1 text-sm text-neutral-400">
        Decides which calendar day counts as “today” when you record a viewing.
        Viewings you already recorded keep their dates.
      </p>
      <form onSubmit={save} className="mt-3 space-y-3">
        <label className="block text-sm">
          <span className="block text-neutral-400">Your timezone</span>
          <select
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSuccess(false);
            }}
            className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
          >
            {options.map((z) => (
              <option key={z} value={z}>
                {z.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={pending || value === current}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save timezone"}
          </button>
          <button
            type="button"
            onClick={useDeviceZone}
            className="rounded border border-neutral-600 px-3 py-2 text-sm hover:border-neutral-400"
          >
            Use this device’s timezone
          </button>
        </div>
        {message && (
          <p role="alert" className="text-sm text-red-400">
            {message}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-green-400">
            Timezone saved.
          </p>
        )}
      </form>
    </section>
  );
}
