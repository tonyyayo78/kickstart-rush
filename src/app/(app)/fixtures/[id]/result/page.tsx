import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createResult, updateResult, deleteResult } from "@/features/results/actions";
import ResultForm from "./ResultForm";
import DeleteResultButton from "@/features/results/DeleteResultButton";

const FMT = new Intl.DateTimeFormat("en-BB", {
  timeZone: "America/Barbados",
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type TeamInfo = {
  id: string;
  team_name: string;
  squad_id: string | null;
  is_kickstart: boolean;
};

type FixtureRow = {
  id: string;
  kickoff_at: string;
  venue: string | null;
  status: string;
  match_state: string | null;
  home_team: TeamInfo;
  away_team: TeamInfo;
};

type Player = {
  id: string;
  display_name: string;
  preferred_position: string;
  squad_id: string | null;
};

type Goal = {
  id: string;
  competition_team_id: string;
  player_id: string | null;
  minute: number | null;
  is_own_goal: boolean;
};

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: fixtureRaw } = await supabase
    .from("fixtures")
    .select(
      `id, kickoff_at, venue, status, match_state,
       home_team:home_team_id(id, team_name, squad_id, is_kickstart),
       away_team:away_team_id(id, team_name, squad_id, is_kickstart)`,
    )
    .eq("id", id)
    .single();

  if (!fixtureRaw) notFound();
  const fixture = fixtureRaw as unknown as FixtureRow;

  // If the match was tracked live, show a read-only banner instead of the manual form
  if (fixture.match_state) {
    const { data: result } = await supabase
      .from("results")
      .select("home_score, away_score")
      .eq("fixture_id", id)
      .single();

    const homeScore = result?.home_score ?? 0;
    const awayScore = result?.away_score ?? 0;
    const isKickstart = fixture.home_team.is_kickstart || fixture.away_team.is_kickstart;

    return (
      <div className="max-w-2xl">
        <div className="mb-1 text-xs text-zinc-400">
          {FMT.format(new Date(fixture.kickoff_at))}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </div>
        <h1 className="mb-6 text-xl font-semibold">
          {fixture.home_team.team_name} vs {fixture.away_team.team_name}
        </h1>
        <div className="rounded-lg border border-[#C7D3F5] bg-[#EEF2FF] p-5">
          <p className="text-sm font-semibold text-[#00267F]">Tracked live</p>
          <p className="mt-1 text-2xl font-black tabular-nums">
            {fixture.home_team.team_name} {homeScore} — {awayScore} {fixture.away_team.team_name}
          </p>
          {fixture.match_state !== "full_time" && (
            <p className="mt-1 text-xs text-zinc-500">Match in progress</p>
          )}
          {isKickstart && (
            <Link
              href={`/fixtures/${id}/live`}
              className="mt-3 inline-block text-sm font-medium text-[#00267F] underline hover:text-[#3349A3]"
            >
              View match events →
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Fetch players for both squads
  const squadIds = [fixture.home_team.squad_id, fixture.away_team.squad_id].filter(
    Boolean,
  ) as string[];

  const homePlayers: Player[] = [];
  const awayPlayers: Player[] = [];

  if (squadIds.length > 0) {
    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, display_name, preferred_position, squad_id")
      .in("squad_id", squadIds)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("last_name", { ascending: true })
      .returns<Player[]>();

    for (const p of allPlayers ?? []) {
      if (p.squad_id === fixture.home_team.squad_id) {
        homePlayers.push(p);
      } else {
        awayPlayers.push(p);
      }
    }
  }

  // Fetch existing result + goals if already played
  let existingResult: {
    id: string;
    home_score: number;
    away_score: number;
    match_notes: string | null;
    goals: Goal[];
  } | null = null;

  if (fixture.status === "played") {
    const { data: result } = await supabase
      .from("results")
      .select("id, home_score, away_score, match_notes")
      .eq("fixture_id", id)
      .single();

    if (result) {
      const { data: goals } = await supabase
        .from("goals")
        .select("id, competition_team_id, player_id, minute, is_own_goal")
        .eq("result_id", result.id)
        .order("minute", { ascending: true, nullsFirst: false });

      existingResult = { ...result, goals: (goals as Goal[]) ?? [] };
    }
  }

  const homeTeam = fixture.home_team;
  const awayTeam = fixture.away_team;

  const createBound = createResult.bind(null);
  const updateBound = existingResult
    ? updateResult.bind(null, existingResult.id, id)
    : null;
  const deleteBound = existingResult
    ? deleteResult.bind(null, existingResult.id, id)
    : null;

  const isKickstart = fixture.home_team.is_kickstart || fixture.away_team.is_kickstart;

  return (
    <div className="max-w-2xl">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          {FMT.format(new Date(fixture.kickoff_at))}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </span>
        {isKickstart && (
          <div className="flex items-center gap-4">
            <Link
              href={`/fixtures/${id}/lineup`}
              className="text-xs font-medium text-[#00267F] hover:underline"
            >
              {existingResult ? "Edit lineup →" : "Set lineup →"}
            </Link>
            <Link
              href={`/fixtures/${id}/fees`}
              className="text-xs font-medium text-[#00267F] hover:underline"
            >
              View match fees →
            </Link>
            <Link
              href={`/fixtures/${id}/live`}
              className="text-xs font-medium text-[#00267F] hover:underline"
            >
              {!fixture.match_state || fixture.match_state === "not_started"
                ? "Start Live Match →"
                : ["h1", "h1_stoppage", "h2", "h2_stoppage"].includes(fixture.match_state)
                ? "Live Match (in progress) →"
                : fixture.match_state === "halftime"
                ? "Live Match (halftime) →"
                : "View Match Events →"}
            </Link>
          </div>
        )}
      </div>
      <h1 className="mb-6 text-xl font-semibold">
        {homeTeam.team_name} vs {awayTeam.team_name}
      </h1>

      <ResultForm
        fixtureId={id}
        homeTeam={{ id: homeTeam.id, name: homeTeam.team_name }}
        awayTeam={{ id: awayTeam.id, name: awayTeam.team_name }}
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
        createAction={createBound}
        updateAction={updateBound}
        existingResult={existingResult}
      />

      {deleteBound && (
        <div className="mt-8 border-t border-black/10 pt-6">
          <DeleteResultButton action={deleteBound} />
        </div>
      )}
    </div>
  );
}
