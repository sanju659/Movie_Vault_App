import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 2026">
      <p>By creating an account you agree to these terms.</p>

      <h2>What WatchVault is</h2>
      <p>
        WatchVault is a personal diary for tracking movies. It is not a
        streaming service and does not provide access to films.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password secret and use accurate details.</li>
        <li>You are responsible for activity under your account.</li>
        <li>You can delete your account at any time in Settings.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        Your ratings, notes, and library belong to you. You give us permission
        to store and display them to you, which is what the service needs to
        work.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not attack, overload, or probe the service, try to access other
        people’s data, or use automated tools to create accounts or scrape
        content.
      </p>

      <h2>Movie data</h2>
      <p>
        Movie information and images are provided by TMDB. This product uses the
        TMDB API but is not endorsed or certified by TMDB. Movie data may be
        incomplete or out of date.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided “as is”, without guarantees of availability or
        accuracy. We may change or stop the service, and we will try to give
        notice first. Download your data from Settings if you want your own
        copy.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above will change when we do.
        Questions: [YOUR CONTACT EMAIL].
      </p>

      <p className="pt-4 text-sm">
        See also the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
