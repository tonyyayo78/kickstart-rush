import { createServerClient } from "@/lib/supabase/server";

const QUICK_LINKS = [
  {
    href: "/fixtures",
    title: "Enter results",
    description: "Record match scores and goalscorers",
  },
  {
    href: "/standings",
    title: "View standings",
    description: "Check the table for Elite and Premier",
  },
  {
    href: "/squads/KE2026/players",
    title: "Manage squads",
    description: "View and edit player rosters",
  },
];

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user!.id)
    .single();

  const name = profile?.display_name ?? profile?.email ?? user?.email ?? "owner";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-blue-600 hover:shadow-md"
          >
            <h2 className="text-lg font-bold uppercase tracking-tight">
              {card.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{card.description}</p>
            <p className="mt-4 font-bold text-blue-600">→</p>
          </a>
        ))}
      </div>
    </div>
  );
}
