import { createServerClient } from "@/lib/supabase/server";

const STATIC_LINKS = [
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

async function getFeesHref(supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<string> {
  // Try next upcoming Kickstart fixture first, then most recent past one.
  const now = new Date().toISOString();

  const { data: upcoming } = await supabase
    .from("fixtures")
    .select("id, home_team:home_team_id(is_kickstart), away_team:away_team_id(is_kickstart)")
    .gte("kickoff_at", now)
    .order("kickoff_at", { ascending: true })
    .limit(10);

  const nextKickstart = (upcoming ?? []).find((f) => {
    const home = f.home_team as unknown as { is_kickstart: boolean };
    const away = f.away_team as unknown as { is_kickstart: boolean };
    return home.is_kickstart || away.is_kickstart;
  });

  if (nextKickstart) return `/fixtures/${nextKickstart.id}/fees`;

  const { data: recent } = await supabase
    .from("fixtures")
    .select("id, home_team:home_team_id(is_kickstart), away_team:away_team_id(is_kickstart)")
    .lt("kickoff_at", now)
    .order("kickoff_at", { ascending: false })
    .limit(10);

  const lastKickstart = (recent ?? []).find((f) => {
    const home = f.home_team as unknown as { is_kickstart: boolean };
    const away = f.away_team as unknown as { is_kickstart: boolean };
    return home.is_kickstart || away.is_kickstart;
  });

  return lastKickstart ? `/fixtures/${lastKickstart.id}/fees` : "/fixtures";
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, feesHref] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user!.id)
      .single(),
    getFeesHref(supabase),
  ]);

  const name = profile?.display_name ?? profile?.email ?? user?.email ?? "owner";

  const allLinks = [
    ...STATIC_LINKS,
    {
      href: feesHref,
      title: "Match fees",
      description: "Record who paid at the gate",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Welcome, {name}
      </h1>
      <div className="mt-2 mb-8 h-1 w-16 bg-[#FFC726]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {allLinks.map((card) => (
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
