import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <SignupForm />;
}
