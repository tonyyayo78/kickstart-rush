import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { FORMATIONS } from "@/lib/formations";
import LineupBuilder from "@/features/lineup/LineupBuilder";

const FMT = new Intl.DateTimeFormat("en-BB", {
  timeZone: "America/Barbados",
  weekday: "short",
  month: "short",
  day: "numeric",
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
  home_team: TeamInfo;
  away_team: TeamInfo;
};

type Player = {
  id: string;
  display_name: string;
  jersey_number: number | null;
  preferred_position: string | null;
};

type LineupPlayerRow = {
  player_id: string;
  role: "starter" | "sub";
  position_label: string | null;
  slot_order: number;
};

type LineupRow = {
  id: string;
  formation: string;
  lineup_players: LineupPlayerRow[];
};

export default async function LineupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: fixtureRaw } = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, venue, home_team:home_team_id(id, team_name, squad_id, is_kickstart), away_team:away_team_id(id, team_name, squad_id, is_kickstart)",
    )
    .eq("id", id)
    .single();

  if (!fixtureRaw) notFound();
  const fixture = fixtureRaw as unknown as FixtureRow;

  const kickstartTeam = fixture.home_team.is_kickstart
    ? fixture.home_team
    : fixture.away_team.is_kickstart
      ? fixture.away_team
      : null;

  if (!kickstartTeam) notFound();

  const opponentName =
    kickstartTeam === fixture.home_team
      ? fixture.away_team.team_name
      : fixture.home_team.team_name;

  const [{ data: playersRaw }, { data: existingLineupRaw }] =
    await Promise.all([
      kickstartTeam.squad_id
        ? supabase
            .from("players")
            .select("id, display_name, jersey_number, preferred_position")
            .eq("squad_id", kickstartTeam.squad_id)
            .is("deleted_at", null)
            .eq("status", "active")
            .order("last_name", { ascending: true })
            .returns<Player[]>()
        : Promise.resolve({ data: [] as Player[] }),
      supabase
        .from("lineups")
        .select(
          "id, formation, lineup_players(player_id, role, position_label, slot_order)",
        )
        .eq("fixture_id", id)
        .maybeSingle(),
    ]);

  const players = (playersRaw ?? []) as Player[];
  const existingLineup = existingLineupRaw as unknown as LineupRow | null;

  return (
    <div className="max-w-2xl">
      <div className="mb-1 flex items-center gap-3 text-xs text-zinc-400">
        <span>
          {kickstartTeam.team_name} vs {opponentName} ·{" "}
          {FMT.format(new Date(fixture.kickoff_at))}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </span>
        <Link
          href={`/fixtures/${id}/result`}
          className="ml-auto shrink-0 font-medium text-[#00267F] hover:underline"
        >
          Result →
        </Link>
      </div>
      <h1 className="mb-2 text-3xl font-black uppercase tracking-tight md:text-4xl">
        Lineup
      </h1>
      <div className="mb-6 h-1 w-16 bg-[#FFC726]" />

      {players.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No active players found for {kickstartTeam.team_name}.{" "}
          <Link href="/players" className="font-medium text-[#00267F] hover:underline">
            Add players →
          </Link>
        </p>
      ) : (
        <LineupBuilder
          fixtureId={id}
          players={players}
          formations={FORMATIONS}
          savedFormation={existingLineup?.formation ?? null}
          savedPlayers={existingLineup?.lineup_players ?? []}
        />
      )}
    </div>
  );
}
