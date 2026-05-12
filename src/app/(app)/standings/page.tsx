import { createServerClient } from "@/lib/supabase/server";

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
};

export default async function StandingsPage() {
  const supabase = await createServerClient();
  const { data: rows } = await supabase
    .from("public_standings")
    .select("*")
    .returns<StandingRow[]>();

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

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">Standings</h1>

      {competitions.size === 0 && (
        <p className="text-sm text-zinc-500">Standings not yet available.</p>
      )}

      {[...competitions.values()].map((comp) => (
        <section key={comp.name} className="mb-10">
          <h2 className="mb-3 text-base font-semibold">{comp.name}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  <th className="pb-2 pr-3 w-8">Pos</th>
                  <th className="pb-2 pr-3">Team</th>
                  <th className="pb-2 px-2 text-center">P</th>
                  <th className="pb-2 px-2 text-center">W</th>
                  <th className="pb-2 px-2 text-center">D</th>
                  <th className="pb-2 px-2 text-center">L</th>
                  <th className="pb-2 px-2 text-center">GF</th>
                  <th className="pb-2 px-2 text-center">GA</th>
                  <th className="pb-2 px-2 text-center">GD</th>
                  <th className="pb-2 pl-2 text-center font-bold">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {comp.rows.map((row, idx) => (
                  <tr
                    key={row.team_name}
                    className={row.is_kickstart ? "bg-blue-50" : ""}
                  >
                    <td className="py-2 pr-3 text-zinc-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td
                      className={`py-2 pr-3 ${
                        row.is_kickstart ? "font-semibold text-blue-800" : ""
                      }`}
                    >
                      {row.team_name}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums">{row.played}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{row.won}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{row.drawn}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{row.lost}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{row.goals_for}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{row.goals_against}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{row.goal_difference}</td>
                    <td className="py-2 pl-2 text-center font-bold tabular-nums">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
