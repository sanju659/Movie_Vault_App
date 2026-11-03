import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 2026">
      <p>
        WatchVault is a personal movie diary. Your account and everything in it
        is private to you. This page explains what we store, why, and how you
        can get it back or delete it.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          Account: your display name, email address, timezone, and a password
          hash (never your password itself).
        </li>
        <li>
          Your library: the movies you add, their status (Watchlist, Watching,
          Watched), and your ratings.
        </li>
        <li>
          Your viewings: the dates you watched a movie and any notes you write.
        </li>
        <li>
          A sign-in cookie that keeps you logged in. It is strictly necessary
          for the service to work.
        </li>
        <li>
          Short-lived counters derived from your IP address and login attempts,
          used to block abuse. They are deleted automatically within about an
          hour.
        </li>
      </ul>
      <p>
        We do not use advertising or analytics trackers, and we do not sell your
        data.
      </p>

      <h2>Why we store it</h2>
      <p>
        To provide the diary you asked for: sign you in, show your library and
        history, and keep the service secure.
      </p>

      <h2>Movie data from TMDB</h2>
      <p>
        Movie information and images come from TMDB. Our server requests it on
        your behalf; your account details are not sent to TMDB. Search terms you
        type are sent to TMDB from our server. This product uses the TMDB API
        but is not endorsed or certified by TMDB.
      </p>

      <h2>Who processes your data</h2>
      <p>
        Your data is stored in a MongoDB Atlas database and served by [YOUR
        HOSTING PROVIDER]. These providers process data only to run the service.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Download everything: Settings → Your data → Download JSON.</li>
        <li>
          Delete everything: Settings → Your data → Delete account. This removes
          your account, library, ratings, viewings, and notes.
        </li>
        <li>Change your password at any time in Settings → Account.</li>
      </ul>
      <p>
        Database backups may keep deleted data for a short period before they
        expire. [STATE YOUR BACKUP RETENTION].
      </p>

      <h2>Contact</h2>
      <p>Questions or requests: [YOUR CONTACT EMAIL].</p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a meaningful way, we will update the date
        above.
      </p>

      <p className="pt-4 text-sm">
        See also the <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
