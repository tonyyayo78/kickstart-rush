import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { U11SubNav } from "./_components/u11-sub-nav";

export default async function U11Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_approver")
    .eq("id", user.id)
    .single();

  const isApprover = profile?.is_approver ?? false;

  let hasElite = isApprover;
  let hasPremier = isApprover;

  if (!isApprover) {
    const { data: teams } = await supabase
      .from("profile_teams")
      .select("squads(code)")
      .eq("profile_id", user.id)
      .returns<{ squads: { code: string } | null }[]>();

    const codes = new Set((teams ?? []).map((t) => t.squads?.code).filter(Boolean));
    hasElite = codes.has("KE-U11-2026");
    hasPremier = codes.has("KP-U11-2026");
  }

  if (!hasElite && !hasPremier) {
    return (
      <div>
        <p className="py-16 text-center text-sm text-zinc-400">
          You have not been assigned to any U11 squad.
        </p>
      </div>
    );
  }

  return (
    <div>
      <U11SubNav hasElite={hasElite} hasPremier={hasPremier} />
      {children}
    </div>
  );
}
