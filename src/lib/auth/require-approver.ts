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
    .select("id, email, is_approver, status, removed_at")
    .eq("id", user.id)
    .single();

  // Defence-in-depth: lock out non-active or removed users at the
  // admin-action gate, matching the (app) layout's check. Addresses
  // security-reviewer Finding 2 against brief-19-security-fixes.
  if (!profile || profile.status !== "active" || profile.removed_at !== null) {
    await supabase.auth.signOut();
    redirect("/sign-in");
  }

  if (!profile.is_approver) redirect("/dashboard");
  return profile as { id: string; email: string; is_approver: boolean };
}
