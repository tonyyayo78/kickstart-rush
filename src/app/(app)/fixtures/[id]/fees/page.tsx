import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import FeesPanel, { type PlayerWithFee } from "@/features/fees/FeesPanel";
import {
  togglePlayerPaid,
  togglePlayerException,
  updateExceptionNote,
} from "@/features/fees/actions";

const BARBADOS_TZ = "America/Barbados";

function formatFixtureLine(kickoffAt: string, venue: string | null): string {
  const date = new Date(kickoffAt);
  const datePart = new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return [datePart, timePart, venue].filter(Boolean).join(" · ");
}

type TeamInfo = {
  id: string;
  team_name: string;
  is_kickstart: boolean;
  squad_id: string | null;
};

type FixtureRow = {
  id: string;
  kickoff_at: string;
  venue: string | null;
  status: string;
  home_team: TeamInfo;
  away_team: TeamInfo;
};

type FeeRow = {
  player_id: string;
  status: "paid" | "exception";
  note: string | null;
};

export default async function FeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: fixtureRaw } = await supabase
    .from("fixtures")
    .select(
      `id, kickoff_at, venue, status,
       home_team:home_team_id(id, team_name, is_kickstart, squad_id),
       away_team:away_team_id(id, team_name, is_kickstart, squad_id)`,
    )
    .eq("id", id)
    .single();

  if (!fixtureRaw) notFound();
  const fixture = fixtureRaw as unknown as FixtureRow;

  // Detect Kickstart side. If both are Kickstart (e.g. internal cup), pick home.
  const kickstartTeam = fixture.home_team.is_kickstart
    ? fixture.home_team
    : fixture.away_team.is_kickstart
      ? fixture.away_team
      : null;

  if (!kickstartTeam || !kickstartTeam.squad_id) {
    return (
      <div className="max-w-lg p-6">
        <p className="text-sm text-zinc-500">
          Fees can only be recorded for Kickstart matches.
        </p>
      </div>
    );
  }

  const [{ data: playersRaw }, { data: feesRaw }] = await Promise.all([
    supabase
      .from("players")
      .select("id, display_name, jersey_number")
      .eq("squad_id", kickstartTeam.squad_id)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("jersey_number", { ascending: true, nullsFirst: false })
      .order("last_name", { ascending: true }),
    supabase
      .from("match_fees")
      .select("player_id, status, note")
      .eq("fixture_id", id)
      .returns<FeeRow[]>(),
  ]);

  const feeMap = new Map<string, FeeRow>();
  for (const fee of feesRaw ?? []) {
    feeMap.set(fee.player_id, fee);
  }

  const players: PlayerWithFee[] = (playersRaw ?? []).map((p) => {
    const fee = feeMap.get(p.id);
    return {
      id: p.id,
      display_name: p.display_name,
      jersey_number: p.jersey_number,
      feeStatus: (fee?.status as PlayerWithFee["feeStatus"]) ?? null,
      note: fee?.note ?? null,
    };
  });

  const fixtureLine = formatFixtureLine(fixture.kickoff_at, fixture.venue);
  const isPlayed =
    fixture.status === "played" &&
    new Date(fixture.kickoff_at) <= new Date();

  const togglePaidBound = togglePlayerPaid.bind(null);
  const toggleExceptionBound = togglePlayerException.bind(null);
  const updateNoteBound = updateExceptionNote.bind(null);

  return (
    <FeesPanel
      fixtureId={id}
      fixtureLine={fixtureLine}
      kickstartTeamName={kickstartTeam.team_name}
      players={players}
      isPlayed={isPlayed}
      togglePaidAction={togglePaidBound}
      toggleExceptionAction={toggleExceptionBound}
      updateNoteAction={updateNoteBound}
    />
  );
}
