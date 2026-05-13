export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import LiveMatchTracker, { type GoalRow, type MatchState, type PlayerOption } from "@/features/live-match/LiveMatchTracker";

const BARBADOS_TZ = "America/Barbados";
const FMT = new Intl.DateTimeFormat("en-BB", {
  timeZone: BARBADOS_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  // ── Fixture + teams ──────────────────────────────────────────
  const { data: fixtureRaw } = await supabase
    .from("fixtures")
    .select(
      `id, kickoff_at, venue, match_state,
       h1_started_at, h2_started_at,
       h1_stoppage_minutes, h2_stoppage_minutes,
       home_team:home_team_id(id, team_name, is_kickstart, squad_id),
       away_team:away_team_id(id, team_name, is_kickstart, squad_id)`,
    )
    .eq("id", id)
    .single();

  if (!fixtureRaw) notFound();

  type TeamRow = { id: string; team_name: string; is_kickstart: boolean; squad_id: string | null };
  const fixture = fixtureRaw as unknown as {
    id: string;
    kickoff_at: string;
    venue: string | null;
    match_state: MatchState | null;
    h1_started_at: string | null;
    h2_started_at: string | null;
    h1_stoppage_minutes: number;
    h2_stoppage_minutes: number;
    home_team: TeamRow;
    away_team: TeamRow;
  };

  const kickstartTeam = fixture.home_team.is_kickstart ? fixture.home_team : fixture.away_team;
  const oppositionTeam = fixture.home_team.is_kickstart ? fixture.away_team : fixture.home_team;
  const kickstartIsHome = fixture.home_team.is_kickstart;

  // ── Squad players ────────────────────────────────────────────
  let players: PlayerOption[] = [];
  if (kickstartTeam.squad_id) {
    const { data: raw } = await supabase
      .from("players")
      .select("id, first_name, last_name, jersey_number")
      .eq("squad_id", kickstartTeam.squad_id)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("jersey_number", { ascending: true, nullsFirst: false })
      .order("last_name");
    players = (raw ?? []) as PlayerOption[];
  }

  // ── Goals (with player names) ─────────────────────────────────
  let goals: GoalRow[] = [];
  const { data: result } = await supabase
    .from("results")
    .select("id")
    .eq("fixture_id", id)
    .single();

  if (result) {
    const { data: rawGoals } = await supabase
      .from("goals")
      .select(
        `id, half, minute, stoppage_minutes, scoring_team,
         player_id, competition_team_id,
         players(first_name, last_name)`,
      )
      .eq("result_id", result.id)
      .order("half")
      .order("minute", { ascending: true, nullsFirst: false })
      .order("stoppage_minutes")
      .order("created_at");

    goals = (rawGoals ?? []).map((g) => {
      const player = g.players as unknown as { first_name: string; last_name: string } | null;
      return {
        id: g.id,
        half: g.half,
        minute: g.minute,
        stoppage_minutes: g.stoppage_minutes,
        scoring_team: g.scoring_team as GoalRow["scoring_team"],
        player_id: g.player_id,
        player_name: player ? `${player.first_name} ${player.last_name}` : null,
        competition_team_id: g.competition_team_id,
      };
    });
  }

  return (
    <div className="max-w-lg">
      {/* Header nav */}
      <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
        <Link href={`/fixtures/${id}/result`} className="hover:underline">
          ← Result
        </Link>
        <span>
          {FMT.format(new Date(fixture.kickoff_at))}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </span>
      </div>

      <h1 className="mb-1 text-xl font-black uppercase tracking-tight">
        {fixture.home_team.team_name} vs {fixture.away_team.team_name}
      </h1>
      <p className="mb-6 text-xs text-zinc-400 uppercase tracking-wide">Live Tracker</p>

      <LiveMatchTracker
        fixtureId={id}
        homeTeamName={fixture.home_team.team_name}
        awayTeamName={fixture.away_team.team_name}
        kickstartTeamId={kickstartTeam.id}
        oppositionTeamId={oppositionTeam.id}
        kickstartIsHome={kickstartIsHome}
        matchState={fixture.match_state}
        h1StartedAt={fixture.h1_started_at}
        h2StartedAt={fixture.h2_started_at}
        h1StoppageMinutes={fixture.h1_stoppage_minutes}
        h2StoppageMinutes={fixture.h2_stoppage_minutes}
        players={players}
        goals={goals}
      />
    </div>
  );
}
