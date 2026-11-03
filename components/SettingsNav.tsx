import Link from "next/link";

const LINKS = [
  { key: "account", href: "/settings/account", label: "Account" },
  { key: "data", href: "/settings/data", label: "Your data" },
] as const;

export default function SettingsNav({
  current,
}: {
  current: "account" | "data";
}) {
  return (
    <nav aria-label="Settings" className="mb-6 flex gap-2">
      {LINKS.map((l) => (
        <Link
          key={l.key}
          href={l.href}
          aria-current={l.key === current ? "page" : undefined}
          className={`rounded border px-3 py-1.5 text-sm ${
            l.key === current
              ? "border-amber-500 bg-amber-500 font-medium text-black"
              : "border-neutral-600 hover:border-neutral-400"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
