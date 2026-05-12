import { createAnonPublicClient } from "@/lib/supabase/anon-public";

type Scorer = {
  team_name: string;
  player_display_name: string | null;
  minute: number | null;
  is_own_goal: boolean;
};

type Result = {
  competition_code: string;
  kickoff_at: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  scorers: Scorer[];
};

export default async function PublicResultsPage() {
  const supabase = await createAnonPublicClient();
  const { data: results } = await supabase
    .from("public_results_with_scorers")
    .select("*")
    .returns<Result[]>();

  if (!results?.length) {
    return (
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
          Results
        </h1>
        <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />
        <p className="text-sm text-zinc-500">
          Results will appear here as matches are played.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Results
      </h1>
      <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />
      <ul className="flex flex-col gap-3">
        {results.map((r, i) => {
          const isKickstart =
            r.home_team_name.toLowerCase().includes("kickstart") ||
            r.away_team_name.toLowerCase().includes("kickstart");

          return (
            <li
              key={i}
              className={`rounded-lg border border-zinc-200 bg-white p-4 ${
                isKickstart ? "border-l-4 border-l-[#FFC726]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex-1 font-bold text-sm">
                  {r.home_team_name}
                </span>
                <span className="font-black text-xl tabular-nums text-[#00267F]">
                  {r.home_score} – {r.away_score}
                </span>
                <span className="flex-1 text-right font-bold text-sm">
                  {r.away_team_name}
                </span>
              </div>
              {r.scorers?.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {r.scorers.map((s, j) => (
                    <li key={j} className="text-sm text-zinc-600">
                      {s.player_display_name ?? s.team_name}
                      {s.minute != null && (
                        <span className="text-zinc-400"> {s.minute}&apos;</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
