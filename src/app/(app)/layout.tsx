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
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-5 md:px-6 md:py-6">
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="hover:opacity-75 transition-opacity shrink-0">
            <Image
              src="/kickstart-logo.png"
              alt="Kickstart Football Club Barbados"
              width={200}
              height={105}
              className="h-[74px] w-auto sm:h-[105px]"
              priority
              unoptimized
            />
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/fixtures" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
              Fixtures
            </a>
            <a href="/standings" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
              Standings
            </a>
            <a href="/squads/KE2026/players" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
              Elite
            </a>
            <a href="/squads/KP2026/players" className="font-bold uppercase tracking-wide text-zinc-700 hover:text-[#00267F] transition-colors">
              Premier
            </a>
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
