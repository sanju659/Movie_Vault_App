import { requireUserOrRedirect } from "@/server/auth/session";
import SettingsNav from "@/components/SettingsNav";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import TimezoneForm from "@/components/TimezoneForm";

export const metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const user = await requireUserOrRedirect();
  const zones = Intl.supportedValuesOf("timeZone");
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <SettingsNav current="account" />

      <dl className="mb-8 grid max-w-sm grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-400">Name</dt>
        <dd>{user.displayName}</dd>
        <dt className="text-neutral-400">Email</dt>
        <dd>{user.email}</dd>
      </dl>

      <TimezoneForm current={user.timezone} zones={zones} />
      <ChangePasswordForm />
    </div>
  );
}
