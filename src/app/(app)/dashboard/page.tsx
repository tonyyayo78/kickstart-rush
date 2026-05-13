import { createServerClient } from "@/lib/supabase/server";

const LINKS = [
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
  {
    href: "/fees",
    title: "Match fees",
    description: "Record who paid match fees",
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

  const rawName = profile?.display_name ?? profile?.email ?? user?.email ?? "owner";
  const name = rawName.includes(" ") ? rawName.split(" ")[0] : rawName;

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Welcome, {name}
      </h1>
      <div className="mt-2 mb-8 h-1 w-16 bg-[#FFC726]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#00267F] hover:shadow-lg"
          >
            <h2 className="text-lg font-bold uppercase tracking-tight">
              {card.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{card.description}</p>
            <p className="mt-4 font-bold text-[#FFC726]">→</p>
          </a>
        ))}
      </div>
    </div>
  );
}
