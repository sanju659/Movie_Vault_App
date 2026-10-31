import { requireUserOrRedirect } from "@/server/auth/session";
import AppHeader from "@/components/AppHeader";
import TmdbAttribution from "@/components/TmdbAttribution";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUserOrRedirect();
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userName={user.displayName} />
      <div className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</div>
      <TmdbAttribution />
    </div>
  );
}
