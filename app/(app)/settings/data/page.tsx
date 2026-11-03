import { requireUserOrRedirect } from "@/server/auth/session";
import SettingsNav from "@/components/SettingsNav";
import DeleteAccountForm from "@/components/DeleteAccountForm";

export const metadata = { title: "Your data" };

export default async function DataSettingsPage() {
  await requireUserOrRedirect();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <SettingsNav current="data" />

      <div className="space-y-8">
        <section
          aria-labelledby="export"
          className="max-w-lg rounded-lg border border-neutral-800 p-4"
        >
          <h2 id="export" className="font-semibold">
            Download your data
          </h2>
          <p className="mt-1 text-sm text-neutral-400">
            A JSON file with your account details, library, ratings, viewings,
            and notes.
          </p>
          {/* Plain link: the browser sends the session cookie and saves the file */}
          <a
            href="/api/users/me/export"
            download
            className="mt-3 inline-block rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black"
          >
            Download JSON
          </a>
        </section>

        <DeleteAccountForm />
      </div>
    </div>
  );
}
