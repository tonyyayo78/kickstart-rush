import Link from "next/link";
import { createAnonPublicClient } from "@/lib/supabase/anon-public";
import FormPills from "@/components/FormPills";

const BARBADOS_TZ = "America/Barbados";

type StandingRow = {
  competition_code: string;
  competition_name: string;
  team_name: string;
  is_kickstart: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: string[];
};

type UpcomingFixture = {
  kickoff_at: string;
  venue: string;
  home_team_name: string;
  away_team_name: string;
  home_is_kickstart: boolean;
  away_is_kickstart: boolean;
};

type LastResult = {
  kickstart_team_id: string;
  kickstart_team_name: string;
  opponent_name: string;
  kickoff_at: string;
  kickstart_score: number;
  opponent_score: number;
  outcome: string;
};

function formatDateHeader(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date(iso));
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${weekday} ${day} ${month}`.toUpperCase();
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function localDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBADOS_TZ,
  }).format(new Date(iso));
}

function squadLabel(teamName: string): string {
  return teamName.replace(/^Kickstart\s*/i, "");
}

export default async function PublicStandingsPage() {
  const supabase = await createAnonPublicClient();

  const [{ data: rows }, { data: upcomingRaw }, { data: lastResultsRaw }] =
    await Promise.all([
      supabase.from("public_standings").select("*").returns<StandingRow[]>(),
      supabase
        .from("public_fixtures")
        .select(
          "kickoff_at, venue, home_team_name, away_team_name, home_is_kickstart, away_is_kickstart",
        )
        .eq("status", "scheduled")
        .gte("kickoff_at", new Date().toISOString())
        .or("home_is_kickstart.eq.true,away_is_kickstart.eq.true")
        .order("kickoff_at", { ascending: true })
        .limit(5)
        .returns<UpcomingFixture[]>(),
      supabase
        .from("public_last_kickstart_results")
        .select("*")
        .returns<LastResult[]>(),
    ]);

  // Build standings map
  const competitions = new Map<string, { name: string; rows: StandingRow[] }>();
  for (const row of rows ?? []) {
    if (!competitions.has(row.competition_code)) {
      competitions.set(row.competition_code, {
        name: row.competition_name,
        rows: [],
      });
    }
    competitions.get(row.competition_code)!.rows.push(row);
  }

  // Group upcoming fixtures by local date
  const upcomingGroups = new Map<string, UpcomingFixture[]>();
  for (const f of upcomingRaw ?? []) {
    const key = localDateKey(f.kickoff_at);
    if (!upcomingGroups.has(key)) upcomingGroups.set(key, []);
    upcomingGroups.get(key)!.push(f);
  }

  // Derive the ordered list of Kickstart teams from standings (already fetched,
  // preserves the points-ordered display order — Elite above Premier or vice versa).
  const kickstartTeams = [...competitions.values()]
    .flatMap((comp) => comp.rows.filter((r) => r.is_kickstart))
    .map((r) => r.team_name);
  // Deduplicate while preserving order
  const seenTeams = new Set<string>();
  const orderedKickstartTeams = kickstartTeams.filter((name) => {
    if (seenTeams.has(name)) return false;
    seenTeams.add(name);
    return true;
  });

  // Index last results by team name for O(1) lookup
  const lastResultByTeam = new Map<string, LastResult>();
  for (const r of lastResultsRaw ?? []) {
    lastResultByTeam.set(r.kickstart_team_name, r);
  }

  return (
    <div>
      {/* Hero band */}
      <div className="-mx-6 -mt-6 mb-8 bg-[#00267F] px-6 py-6 text-white md:py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
            BFA U15 Qualifiers 2026
          </h1>
          <p className="mt-3 text-[#B8C5E8]">
            Live standings for Kickstart Elite and Kickstart Premier in the{" "}
            <span className="text-[#FFC726] font-bold">National Youth Tournament</span>.
          </p>
        </div>
      </div>

      {/* Last match strip */}
      {orderedKickstartTeams.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-tight">
            Last Match
          </h2>
          <div className="mt-2 mb-4 h-1 w-12 bg-[#FFC726]" />
          <div className="flex flex-col gap-2">
            {orderedKickstartTeams.map((teamName) => {
              const result = lastResultByTeam.get(teamName) ?? null;
              const label = squadLabel(teamName);

              return (
                <Link
                  key={teamName}
                  href="/public/results"
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-[#00267F]"
                >
                  <span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    {label}
                  </span>

                  {result ? (
                    <>
                      <span className="flex-1 text-sm">
                        <span className="font-black tabular-nums">
                          {result.kickstart_score}–{result.opponent_score}
                        </span>
                        <span className="ml-2 text-zinc-600">
                          {result.opponent_name}
                        </span>
                      </span>
                      <FormPills form={[result.outcome]} />
                      <span className="shrink-0 text-xs text-zinc-400">
                        {formatShortDate(result.kickoff_at)}
                      </span>
                    </>
                  ) : (
                    <span className="flex-1 text-sm italic text-zinc-400">
                      No matches played yet
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Next matches */}
      {upcomingGroups.size > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-tight">
            Next Matches
          </h2>
          <div className="mt-2 mb-4 h-1 w-12 bg-[#FFC726]" />
          <div className="flex flex-col gap-4">
            {[...upcomingGroups.entries()].map(([dateKey, fixtures]) => (
              <div key={dateKey}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  {formatDateHeader(fixtures[0].kickoff_at)}
                </p>
                <ul className="flex flex-col gap-2">
                  {fixtures.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
                    >
                      <span className="w-16 shrink-0 pt-px text-sm tabular-nums text-zinc-500">
                        {formatTime(f.kickoff_at)}
                      </span>
                      <div className="min-w-0 flex-1 text-sm">
                        <span className={f.home_is_kickstart ? "font-bold text-[#00267F]" : "font-medium"}>
                          {f.home_team_name}
                        </span>
                        <span className="mx-1.5 text-zinc-400">vs</span>
                        <span className={f.away_is_kickstart ? "font-bold text-[#00267F]" : "font-medium"}>
                          {f.away_team_name}
                        </span>
                        {f.venue && (
                          <span className="mt-0.5 block text-xs text-zinc-400">
                            {f.venue}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link
            href="/public/fixtures"
            className="mt-4 inline-block text-sm font-medium text-[#00267F] hover:underline"
          >
            View all fixtures →
          </Link>
        </section>
      )}

      {competitions.size === 0 && (
        <p className="text-sm text-zinc-500">Standings not yet available.</p>
      )}

      {[...competitions.values()].map((comp) => (
        <section key={comp.name} className="mb-10">
          <h2 className="mb-3 text-base font-bold uppercase tracking-wide text-zinc-700">
            {comp.name}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left text-xs font-bold uppercase tracking-wide text-zinc-600">
                  <th className="w-8 px-4 py-3">Pos</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center">P</th>
                  <th className="px-4 py-3 text-center">W</th>
                  <th className="px-4 py-3 text-center">D</th>
                  <th className="px-4 py-3 text-center">L</th>
                  <th className="px-4 py-3 text-center">GF</th>
                  <th className="px-4 py-3 text-center">GA</th>
                  <th className="px-4 py-3 text-center">GD</th>
                  <th className="px-4 py-3 text-center">Pts</th>
                  <th className="px-4 py-3">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {comp.rows.map((row, idx) => (
                  <>
                    {idx === 4 && comp.rows.length > 4 && (
                      <tr key="qualification-divider" aria-hidden="true">
                        <td colSpan={11} className="px-4 py-0">
                          <div className="py-1">
                            <p className="mb-1 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Super 8 qualification
                            </p>
                            <div className="border-t border-zinc-300" />
                            <p className="mt-1 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Plate
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr
                      key={row.team_name}
                      className={`transition-colors hover:bg-zinc-50 ${row.is_kickstart ? "bg-[#EEF2FF]" : ""}`}
                    >
                      <td className="px-4 py-3 tabular-nums text-zinc-400">
                        {idx === 0 ? "★" : idx + 1}
                      </td>
                      <td className={`px-4 py-3 ${row.is_kickstart ? "font-bold text-[#00267F]" : ""}`}>
                        {row.team_name}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{row.played}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{row.won}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{row.drawn}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{row.lost}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{row.goals_for}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{row.goals_against}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{row.goal_difference}</td>
                      <td className="px-4 py-3 text-center font-black tabular-nums text-[#FFC726]">
                        {row.points}
                      </td>
                      <td className="px-4 py-3">
                        <FormPills form={row.form} />
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
