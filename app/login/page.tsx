import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <LoginForm />;
}
