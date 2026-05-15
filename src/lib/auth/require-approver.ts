import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function requireApprover() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, is_approver")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approver) redirect("/dashboard");
  return profile as { id: string; email: string; is_approver: boolean };
}
