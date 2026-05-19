import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { SubstitutionCardSheet } from "@/features/sub-cards/SubstitutionCardSheet";
import PrintButton from "@/features/sub-cards/PrintButton";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("en-BB", {
  timeZone: "America/Barbados",
  year: "numeric",
  month: "short",
  day: "numeric",
});

type TeamRow = {
  id: string;
  team_name: string;
  is_kickstart: boolean;
};

type FixtureRow = {
  id: string;
  kickoff_at: string;
  home_team: TeamRow;
  away_team: TeamRow;
};

export default async function SubCardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: fixtureRaw } = await supabase
    .from("fixtures")
    .select(
      `id, kickoff_at,
       home_team:home_team_id(id, team_name, is_kickstart),
       away_team:away_team_id(id, team_name, is_kickstart)`,
    )
    .eq("id", id)
    .single();

  if (!fixtureRaw) notFound();
  const fixture = fixtureRaw as unknown as FixtureRow;

  const kickstartTeam = fixture.home_team?.is_kickstart
    ? fixture.home_team
    : fixture.away_team?.is_kickstart
      ? fixture.away_team
      : null;

  if (!kickstartTeam) notFound();

  const dateStr = fixture.kickoff_at
    ? DATE_FMT.format(new Date(fixture.kickoff_at))
    : "";

  return (
    <div>
      <div className="print-controls mb-4">
        <PrintButton />
      </div>
      <SubstitutionCardSheet
        teamName={kickstartTeam.team_name}
        dateStr={dateStr}
      />
    </div>
  );
}
