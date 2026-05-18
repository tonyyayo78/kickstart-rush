import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { U17SubNav } from "./_components/u17-sub-nav";

export default async function U17Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_approver")
    .eq("id", user.id)
    .single();

  const isApprover = profile?.is_approver ?? false;
  let hasKickstart = isApprover;

  if (!isApprover) {
    const { data: teams } = await supabase
      .from("profile_teams")
      .select("squads(code)")
      .eq("profile_id", user.id)
      .returns<{ squads: { code: string } | null }[]>();

    const codes = new Set((teams ?? []).map((t) => t.squads?.code).filter(Boolean));
    hasKickstart = codes.has("K-U17-2026");
  }

  if (!hasKickstart) {
    return (
      <div>
        <p className="py-16 text-center text-sm text-zinc-400">
          You have not been assigned to any U17 squad.
        </p>
      </div>
    );
  }

  return (
    <div>
      <U17SubNav hasKickstart={hasKickstart} />
      {children}
    </div>
  );
}
