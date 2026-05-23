import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { TeamSheet } from "@/features/team-sheet/TeamSheet";
import PrintButton from "@/features/team-sheet/PrintButton";

export const dynamic = "force-dynamic";

type SquadRow = {
  id: string;
  name: string;
  code: string;
  coach_name: string | null;
};

type TeamRow = {
  id: string;
  team_name: string;
  squad_id: string | null;
  is_kickstart: boolean;
  squad: SquadRow | null;
};

type FixtureRow = {
  id: string;
  kickoff_at: string;
  venue: string | null;
  home_team: TeamRow;
  away_team: TeamRow;
  competition: { name: string } | null;
};

type LineupPlayerRow = {
  player_id: string;
  role: "starter" | "sub";
  slot_order: number;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    jersey_number: number | null;
  } | null;
};

type LineupRow = {
  id: string;
  formation: string;
  lineup_players: LineupPlayerRow[];
};

function deriveAgeGroup(competitionName: string): string {
  const m = competitionName.match(/U[-\s]?(\d+)/i);
  return m ? `Under-${m[1]}` : competitionName;
}

export default async function TeamSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: fixtureRaw } = await supabase
    .from("fixtures")
    .select(
      `id, kickoff_at, venue,
       home_team:home_team_id(id, team_name, squad_id, is_kickstart, squad:squad_id(id, name, code, coach_name)),
       away_team:away_team_id(id, team_name, squad_id, is_kickstart, squad:squad_id(id, name, code, coach_name)),
       competition:competition_id(name)`,
    )
    .eq("id", id)
    .single();

  if (!fixtureRaw) notFound();

  const fixture = fixtureRaw as unknown as FixtureRow;

  const isHomeKickstart = fixture.home_team?.is_kickstart === true;
  const kickstartTeam = isHomeKickstart ? fixture.home_team : fixture.away_team;

  if (!kickstartTeam?.is_kickstart || !kickstartTeam.squad?.id) notFound();

  const squad = kickstartTeam.squad;

  const { data: lineupRaw } = await supabase
    .from("lineups")
    .select(
      `id, formation,
       lineup_players(player_id, role, slot_order, player:players(id, first_name, last_name, jersey_number))`,
    )
    .eq("fixture_id", id)
    .maybeSingle();

  const lineup = lineupRaw as unknown as LineupRow | null;
  const lineupPlayers = lineup?.lineup_players ?? [];

  const starters = lineupPlayers
    .filter((r) => r.role === "starter")
    .sort((a, b) => (a.player?.jersey_number ?? 99) - (b.player?.jersey_number ?? 99))
    .map((r) => ({
      jerseyNumber: r.player?.jersey_number ?? null,
      playerName: r.player ? `${r.player.first_name} ${r.player.last_name}`.trim().replace(/\s+/g, ' ').toUpperCase() : "",
    }));

  const subs = lineupPlayers
    .filter((r) => r.role === "sub")
    .sort((a, b) => (a.player?.jersey_number ?? 99) - (b.player?.jersey_number ?? 99))
    .map((r) => ({
      jerseyNumber: r.player?.jersey_number ?? null,
      playerName: r.player ? `${r.player.first_name} ${r.player.last_name}`.trim().replace(/\s+/g, ' ').toUpperCase() : "",
    }));

  const ageGroup = deriveAgeGroup(fixture.competition?.name ?? "");

  return (
    <div>
      <div className="print-controls mb-4">
        <PrintButton />
      </div>
      <TeamSheet
        fixture={{
          homeTeamName: fixture.home_team?.team_name ?? "",
          awayTeamName: fixture.away_team?.team_name ?? "",
          kickoffAt: fixture.kickoff_at ? new Date(fixture.kickoff_at) : null,
          venue: fixture.venue,
          ageGroup,
        }}
        isHomeTeam={isHomeKickstart}
        starters={starters}
        subs={subs}
        coachName={squad.coach_name}
        squadCode={squad.code}
      />
    </div>
  );
}
