import Image from "next/image";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/features/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, is_approver, must_change_password")
    .eq("id", user.id)
    .single();

  if (profile?.must_change_password) redirect("/auth/set-password");

  const { count: squadCount } = await supabase
    .from("profile_teams")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const displayName = profile?.display_name ?? profile?.email ?? user.email;
  const isApprover = profile?.is_approver ?? false;
  const hasSquads = (squadCount ?? 0) > 0;

  const initials = (displayName ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 shadow-card md:px-6">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="hover:opacity-75 transition-opacity shrink-0">
            <Image
              src="/kickstart-logo.png"
              alt="Kickstart Rush Football Club"
              width={200}
              height={105}
              className="h-8 w-auto"
              priority
              unoptimized
            />
          </a>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <NavLink href="/fixtures">Fixtures</NavLink>
            <NavLink href="/fees">Fees</NavLink>
            <NavLink href="/standings">Standings</NavLink>
            {hasSquads && <NavLink href="/teams">Teams</NavLink>}
            {isApprover && (
              <NavLink href="/admin/users">
                <span className="mr-1 text-[hsl(var(--accent))]">●</span>
                User Admin
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right: theme toggle + avatar */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2.5">
            <span className="text-sm text-muted-foreground">{displayName}</span>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
            title={displayName ?? ""}
          >
            {initials}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="p-6 animate-in fade-in duration-300">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </a>
  );
}
