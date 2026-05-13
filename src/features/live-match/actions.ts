"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | null;

async function authed() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return supabase;
}

function live(fixtureId: string) {
  revalidatePath(`/fixtures/${fixtureId}/live`);
}

// ── Ensure a results row exists, return its id ───────────────
async function ensureResult(
  supabase: Awaited<ReturnType<typeof authed>>,
  fixtureId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("results")
    .select("id")
    .eq("fixture_id", fixtureId)
    .single();
  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("results")
    .insert({ fixture_id: fixtureId, home_score: 0, away_score: 0 })
    .select("id")
    .single();
  return created?.id ?? null;
}

// ── Clock actions ────────────────────────────────────────────

export async function kickOff(fixtureId: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("fixtures")
    .update({ match_state: "h1", h1_started_at: new Date().toISOString() })
    .eq("id", fixtureId);
  if (error) return { error: "Failed to start match." };

  await ensureResult(supabase, fixtureId);
  live(fixtureId);
  return null;
}

export async function setStoppage(
  fixtureId: string,
  half: 1 | 2,
  minutes: number,
): Promise<ActionResult> {
  const col = half === 1 ? "h1_stoppage_minutes" : "h2_stoppage_minutes";
  const state = half === 1 ? "h1_stoppage" : "h2_stoppage";
  const supabase = await authed();
  const { error } = await supabase
    .from("fixtures")
    .update({ [col]: minutes, match_state: minutes > 0 ? state : half === 1 ? "h1" : "h2" })
    .eq("id", fixtureId);
  if (error) return { error: "Failed to set stoppage." };
  live(fixtureId);
  return null;
}

export async function endFirstHalf(fixtureId: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("fixtures")
    .update({ match_state: "halftime" })
    .eq("id", fixtureId);
  if (error) return { error: "Failed to end first half." };
  live(fixtureId);
  return null;
}

export async function startSecondHalf(fixtureId: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("fixtures")
    .update({ match_state: "h2", h2_started_at: new Date().toISOString() })
    .eq("id", fixtureId);
  if (error) return { error: "Failed to start second half." };
  live(fixtureId);
  return null;
}

export async function endMatch(fixtureId: string): Promise<ActionResult> {
  const supabase = await authed();

  // Fetch fixture to determine home/away team ids
  const { data: fixture } = await supabase
    .from("fixtures")
    .select("home_team_id, away_team_id")
    .eq("id", fixtureId)
    .single();
  if (!fixture) return { error: "Fixture not found." };

  const resultId = await ensureResult(supabase, fixtureId);
  if (!resultId) return { error: "Could not find result row." };

  const { data: goals } = await supabase
    .from("goals")
    .select("competition_team_id")
    .eq("result_id", resultId);

  const home_score = (goals ?? []).filter(
    (g) => g.competition_team_id === fixture.home_team_id,
  ).length;
  const away_score = (goals ?? []).filter(
    (g) => g.competition_team_id === fixture.away_team_id,
  ).length;

  const { error: rErr } = await supabase
    .from("results")
    .update({ home_score, away_score })
    .eq("id", resultId);
  if (rErr) return { error: "Failed to update scores." };

  const { error: fErr } = await supabase
    .from("fixtures")
    .update({ match_state: "full_time", status: "played" })
    .eq("id", fixtureId);
  if (fErr) return { error: "Failed to end match." };

  revalidatePath(`/fixtures/${fixtureId}/live`);
  revalidatePath(`/fixtures/${fixtureId}/result`);
  return null;
}

export async function reopenMatch(fixtureId: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("fixtures")
    .update({ match_state: "h2", status: "scheduled" })
    .eq("id", fixtureId);
  if (error) return { error: "Failed to reopen match." };
  revalidatePath(`/fixtures/${fixtureId}/live`);
  revalidatePath(`/fixtures/${fixtureId}/result`);
  return null;
}

// ── Goal actions ─────────────────────────────────────────────

export async function logGoal(
  fixtureId: string,
  data: {
    half: 1 | 2;
    minute: number;
    stoppageMinutes: number;
    scoringTeam: "kickstart" | "opposition";
    kickstartTeamId: string;
    oppositionTeamId: string;
    playerId?: string;
  },
): Promise<ActionResult> {
  const supabase = await authed();
  const resultId = await ensureResult(supabase, fixtureId);
  if (!resultId) return { error: "No result row found." };

  const competition_team_id =
    data.scoringTeam === "kickstart" ? data.kickstartTeamId : data.oppositionTeamId;

  const { error } = await supabase.from("goals").insert({
    result_id: resultId,
    competition_team_id,
    player_id: data.playerId ?? null,
    half: data.half,
    minute: data.minute,
    stoppage_minutes: data.stoppageMinutes,
    scoring_team: data.scoringTeam,
    is_own_goal: false,
  });
  if (error) return { error: "Failed to log goal." };
  live(fixtureId);
  return null;
}

export async function deleteGoal(
  goalId: string,
  fixtureId: string,
): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) return { error: "Failed to delete goal." };
  live(fixtureId);
  return null;
}

export async function updateGoal(
  goalId: string,
  fixtureId: string,
  data: {
    half: 1 | 2;
    minute: number;
    stoppageMinutes: number;
    playerId?: string;
  },
): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("goals")
    .update({
      half: data.half,
      minute: data.minute,
      stoppage_minutes: data.stoppageMinutes,
      player_id: data.playerId ?? null,
    })
    .eq("id", goalId);
  if (error) return { error: "Failed to update goal." };
  live(fixtureId);
  return null;
}
