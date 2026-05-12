import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

const FMT = new Intl.DateTimeFormat("en-BB", {
  timeZone: "America/Barbados",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Fixture = {
  id: string;
  kickoff_at: string;
  venue: string | null;
  status: string;
  home_team: { team_name: string };
  away_team: { team_name: string };
};

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "played" ? "played" : "scheduled";

  const supabase = await createServerClient();

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, venue, status, home_team:home_team_id(team_name), away_team:away_team_id(team_name)",
    )
    .eq("status", activeTab)
    .order("kickoff_at", { ascending: activeTab === "scheduled" })
    .returns<Fixture[]>();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Fixtures</h1>

      <div className="mb-6 flex gap-1 rounded-lg border border-black/10 p-1 w-fit">
        <Link
          href="/fixtures"
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "scheduled"
              ? "bg-foreground text-background"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          To enter
        </Link>
        <Link
          href="/fixtures?tab=played"
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "played"
              ? "bg-foreground text-background"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Played
        </Link>
      </div>

      {!fixtures?.length ? (
        <p className="text-sm text-zinc-500">
          {activeTab === "scheduled" ? "No fixtures to enter." : "No played fixtures yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10">
          {fixtures.map((f) => (
            <li key={f.id}>
              <Link
                href={`/fixtures/${f.id}/result`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-black/[0.02] transition-colors"
              >
                <span className="w-36 shrink-0 text-xs text-zinc-400">
                  {FMT.format(new Date(f.kickoff_at))}
                </span>
                <span className="flex-1 text-sm">
                  <span className="font-medium">{f.home_team.team_name}</span>
                  <span className="mx-2 text-zinc-400">vs</span>
                  <span className="font-medium">{f.away_team.team_name}</span>
                </span>
                {f.venue && (
                  <span className="hidden text-xs text-zinc-400 sm:block">
                    {f.venue}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
