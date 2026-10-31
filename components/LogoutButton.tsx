"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return (
    <button
      onClick={logout}
      className="rounded border border-neutral-600 px-3 py-1 text-sm"
    >
      Log out
    </button>
  );
}
