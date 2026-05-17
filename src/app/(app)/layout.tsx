import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/features/auth/actions";
import { Logo } from "@/components/logo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, is_approver, must_change_password, status, removed_at")
    .eq("id", user.id)
    .single();

  // Defence-in-depth: lock out non-active or removed users even if their
  // Supabase session is still valid. Current data model only ever sets
  // status='active' on profile insert, but this check defends against
  // future drift and addresses audit finding 2026-05-15 #2.
  if (!profile || profile.status !== "active" || profile.removed_at !== null) {
    await supabase.auth.signOut();
    redirect("/sign-in");
  }

  if (profile.must_change_password) redirect("/auth/set-password");

  // Best-effort heartbeat — throttled to one write per 60s per user
  try {
    // eslint-disable-next-line react-hooks/purity
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    const now = new Date().toISOString();
    await createAdminClient()
      .from("profiles")
      .update({ last_active_at: now })
      .eq("id", user.id)
      .or(`last_active_at.is.null,last_active_at.lt.${sixtySecondsAgo}`);
  } catch {
    // swallow — heartbeat failure never blocks a page render
  }

  const { count: squadCount } = await supabase
    .from("profile_teams")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const displayName = profile?.display_name ?? profile?.email ?? user.email;
  const isApprover = profile?.is_approver ?? false;
  const hasSquads = (squadCount ?? 0) > 0;

  return (
    <div className="min-h-screen">
      <header data-app-chrome="true" className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-5 md:px-6 md:py-6">
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="hover:opacity-75 transition-opacity shrink-0">
            <Logo className="h-10 md:h-12" priority />
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/fixtures" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
              Fixtures
            </a>
            <a href="/fees" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
              Fees
            </a>
            <a href="/standings" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
              Standings
            </a>
            {hasSquads && (
              <a href="/teams" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
                Teams
              </a>
            )}
            {isApprover && (
              <a href="/admin/users" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
                User Admin
              </a>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-zinc-600">{displayName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
