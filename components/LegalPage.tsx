import Link from "next/link";
// import { IoIosArrowDropleftCircle } from "react-icons/io";
import { FaCircleArrowLeft } from "react-icons/fa6";
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-amber-500 hover:underline"
      >
        {/* <IoIosArrowDropleftCircle /> WatchVault */}
        <FaCircleArrowLeft /> WatchVault
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-neutral-400">Last updated: {updated}</p>
      <div className="mt-6 space-y-3 text-neutral-300 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-100 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:underline">
        {children}
      </div>
    </main>
  );
}
