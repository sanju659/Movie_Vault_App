import Link from "next/link";

type Item = number | "gap-start" | "gap-end";

// 1 … 4 5 6 … 20, with a few extra pages near either edge so the ribbon doesn't jump around
function buildItems(current: number, total: number): Item[] {
  const keep = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => keep.add(p));
  if (current >= total - 2)
    [total - 3, total - 2, total - 1].forEach((p) => keep.add(p));

  const pages = [...keep]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const items: Item[] = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    if (prev !== undefined && p - prev > 1) {
      // A gap of exactly one page is shown as that page instead of "…"
      if (p - prev === 2) items.push(prev + 1);
      else items.push(i < pages.length / 2 ? "gap-start" : "gap-end");
    }
    items.push(p);
  });
  return items;
}

const base = "rounded border px-3 py-1.5 text-sm";
const idle = `${base} border-neutral-600 hover:border-neutral-400`;

export default function PageNumbers({
  label,
  current,
  total,
  hrefFor,
}: {
  label: string; // accessible name, e.g. "Acted in pagination"
  current: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  if (total <= 1) return null;

  return (
    <nav aria-label={label} className="mt-4 flex flex-wrap items-center gap-2">
      {current > 1 ? (
        <Link href={hrefFor(current - 1)} rel="prev" className={idle}>
          Previous
        </Link>
      ) : (
        <span
          aria-hidden
          className={`${base} border-neutral-800 text-neutral-600`}
        >
          Previous
        </span>
      )}

      <ul className="flex flex-wrap items-center gap-1">
        {buildItems(current, total).map((item) =>
          typeof item === "string" ? (
            <li key={item} aria-hidden className="px-1 text-neutral-500">
              …
            </li>
          ) : (
            <li key={item}>
              {item === current ? (
                <span
                  aria-current="page"
                  aria-label={`Page ${item}, current page`}
                  className={`${base} inline-block min-w-9 border-amber-500 bg-amber-500 text-center font-medium text-black`}
                >
                  {item}
                </span>
              ) : (
                <Link
                  href={hrefFor(item)}
                  aria-label={`Page ${item}`}
                  className={`${idle} inline-block min-w-9 text-center`}
                >
                  {item}
                </Link>
              )}
            </li>
          ),
        )}
      </ul>

      {current < total ? (
        <Link href={hrefFor(current + 1)} rel="next" className={idle}>
          Next
        </Link>
      ) : (
        <span
          aria-hidden
          className={`${base} border-neutral-800 text-neutral-600`}
        >
          Next
        </span>
      )}
    </nav>
  );
}
