"use client";

import { usePathname, useSearchParams } from "next/navigation";

export default function HeaderSearch() {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = pathname === "/search" ? (params.get("q") ?? "") : "";

  return (
    <form action="/search" role="search" className="ml-auto w-full sm:w-64">
      <input
        key={q} // remounts when the URL query changes, so defaultValue updates
        name="q"
        type="search"
        defaultValue={q}
        aria-label="Search movies"
        placeholder="Search movies…"
        maxLength={100}
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
      />
    </form>
  );
}
