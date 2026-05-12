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
        <h1 className="mb-6 text-2xl font-bold">Results</h1>
        <p className="text-sm text-zinc-500">
          Results will appear here as matches are played.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Results</h1>
      <ul className="flex flex-col gap-4">
        {results.map((r, i) => (
          <li key={i} className="rounded-lg border border-black/10 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium">{r.home_team_name}</span>
              <span className="font-bold tabular-nums">
                {r.home_score} – {r.away_score}
              </span>
              <span className="font-medium">{r.away_team_name}</span>
            </div>
            {r.scorers?.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {r.scorers.map((s, j) => (
                  <li key={j} className="text-xs text-zinc-500">
                    {s.player_display_name ?? s.team_name}
                    {s.minute != null && (
                      <span className="text-zinc-400"> {s.minute}&apos;</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
