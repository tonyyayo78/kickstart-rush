import Image from "next/image";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";

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
    .select("email, display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? profile?.email ?? user.email;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-black/10 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="flex items-center gap-3 hover:opacity-75 transition-opacity">
            <Image
              src="/kickstart-logo.png"
              alt="Kickstart Football Club Barbados"
              width={150}
              height={48}
              priority
            />
            <span className="hidden sm:inline text-2xl font-bold tracking-tight uppercase">
              Kickstart Rush
            </span>
          </a>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            <a href="/fixtures" className="hover:text-foreground transition-colors">
              Fixtures
            </a>
            <a href="/standings" className="hover:text-foreground transition-colors">
              Standings
            </a>
            <a href="/squads/KE2026/players" className="hover:text-foreground transition-colors">
              Elite
            </a>
            <a href="/squads/KP2026/players" className="hover:text-foreground transition-colors">
              Premier
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600">{displayName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-black/10 px-3 py-1.5 text-sm transition-colors hover:bg-black/5"
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
