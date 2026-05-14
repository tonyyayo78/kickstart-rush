import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import SetPasswordForm from "./SetPasswordForm";

export default async function SetPasswordPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Set your password
        </h1>
        <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />
        <p className="mb-6 text-sm text-zinc-600">
          Choose a password you&apos;ll use to sign in.
        </p>
        <SetPasswordForm />
      </div>
    </main>
  );
}
