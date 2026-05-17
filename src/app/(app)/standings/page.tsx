import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import AgeFilterPills from "@/features/public-age-filter/AgeFilterPills";
import {
  parseAgeParam,
  matchesAgeFilter,
  compareCompetitionCode,
} from "@/features/public-age-filter/age-filter";

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

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ age?: string }>;
}) {
  const { age } = await searchParams;
  const filter = parseAgeParam(age);

  const supabase = await createServerClient();
  const { data: rows } = await supabase
    .from("public_standings")
    .select("*")
    .returns<StandingRow[]>();

  const competitions = new Map<string, { name: string; rows: StandingRow[] }>();
  for (const row of (rows ?? []).filter((r) => matchesAgeFilter(r.competition_code, filter))) {
    if (!competitions.has(row.competition_code)) {
      competitions.set(row.competition_code, {
        name: row.competition_name,
        rows: [],
      });
    }
    competitions.get(row.competition_code)!.rows.push(row);
  }

  const orderedCompetitions = [...competitions.entries()].sort(([codeA], [codeB]) =>
    compareCompetitionCode(codeA, codeB)
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Standings
      </h1>
      <div className="mt-2 mb-4 h-1 w-16 bg-[#FFC726]" />

      <Suspense>
        <AgeFilterPills />
      </Suspense>

      {competitions.size === 0 && (
        <p className="text-sm text-zinc-500">Standings not yet available.</p>
      )}

      {orderedCompetitions.map(([, comp]) => (
        <section key={comp.name} className="mb-10">
          <h2 className="mb-3 text-base font-bold uppercase tracking-wide text-zinc-700">
            {comp.name}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left text-xs font-bold uppercase tracking-wide text-zinc-600">
                  <th className="px-4 py-3 w-8">Pos</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center">P</th>
                  <th className="px-4 py-3 text-center">W</th>
                  <th className="px-4 py-3 text-center">D</th>
                  <th className="px-4 py-3 text-center">L</th>
                  <th className="px-4 py-3 text-center">GF</th>
                  <th className="px-4 py-3 text-center">GA</th>
                  <th className="px-4 py-3 text-center">GD</th>
                  <th className="px-4 py-3 text-center">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {comp.rows.map((row, idx) => (
                  <tr
                    key={row.team_name}
                    className={`transition-colors hover:bg-zinc-50 ${row.is_kickstart ? "bg-[#EEF2FF]" : ""}`}
                  >
                    <td className="px-4 py-3 text-zinc-400 tabular-nums">
                      {idx === 0 ? "★" : idx + 1}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        row.is_kickstart ? "font-bold text-[#00267F]" : ""
                      }`}
                    >
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
