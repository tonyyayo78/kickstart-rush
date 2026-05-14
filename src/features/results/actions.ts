"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const goalSchema = z.object({
  competitionTeamId: z.string().uuid(),
  playerId: z.string().uuid().nullable(),
  minute: z.number().int().min(1).max(130).nullable(),
  isOwnGoal: z.boolean(),
});

const cardSchema = z.object({
  playerId: z.string().uuid(),
  cardType: z.enum(["yellow", "red", "second_yellow"]),
  minute: z.number().int().min(0).max(130).nullable(),
  note: z.string().max(500).optional(),
});

const resultSchema = z.object({
  fixtureId: z.string().uuid(),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  matchNotes: z.string().max(5000).optional(),
  scorers: z.array(goalSchema),
  cards: z.array(cardSchema).default([]),
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
});

export type ResultActionState = { error: string } | null;

export async function createResult(
  input: unknown,
): Promise<ResultActionState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { fixtureId, homeScore, awayScore, matchNotes, scorers, cards, homeTeamId, awayTeamId } =
    parsed.data;

  const homeScorers = scorers.filter((s) => s.competitionTeamId === homeTeamId).length;
  const awayScorers = scorers.filter((s) => s.competitionTeamId === awayTeamId).length;
  if (homeScorers > homeScore) {
    return { error: `Too many home scorers (${homeScorers}) for the score (${homeScore}).` };
  }
  if (awayScorers > awayScore) {
    return { error: `Too many away scorers (${awayScorers}) for the score (${awayScore}).` };
  }

  const { data: result, error: resultError } = await supabase
    .from("results")
    .insert({
      fixture_id: fixtureId,
      home_score: homeScore,
      away_score: awayScore,
      match_notes: matchNotes ?? null,
      entered_by: user.id,
    })
    .select("id")
    .single();

  if (resultError) {
    if (resultError.code === "23505") {
      return { error: "A result already exists for this fixture. Use Edit instead." };
    }
    return { error: "Failed to save result. Try again." };
  }

  if (scorers.length > 0) {
    // If goals insert fails, delete the orphan result row to keep the table
    // consistent — no partial result with a wrong fixture status.
    const { error: goalsError } = await supabase.from("goals").insert(
      scorers.map((s) => ({
        result_id: result.id,
        competition_team_id: s.competitionTeamId,
        player_id: s.playerId,
        minute: s.minute,
        is_own_goal: s.isOwnGoal,
      })),
    );

    if (goalsError) {
      await supabase.from("results").delete().eq("id", result.id);
      return { error: "Failed to save scorers. Result rolled back." };
    }
  }

  if (cards.length > 0) {
    const { error: cardsError } = await supabase.from("cards").insert(
      cards.map((c) => ({
        fixture_id: fixtureId,
        player_id: c.playerId,
        card_type: c.cardType,
        minute: c.minute,
        note: c.note ?? null,
        created_by: user.id,
      })),
    );

    if (cardsError) {
      console.error("cards insert error (create):", cardsError);
      await supabase.from("results").delete().eq("id", result.id);
      return { error: "Failed to save cards. Result rolled back." };
    }
  }

  revalidatePath(`/fixtures/${fixtureId}/result`);
  revalidatePath("/fixtures");
  revalidatePath("/standings");
  redirect(`/fixtures/${fixtureId}/result`);
}

export async function updateResult(
  resultId: string,
  fixtureId: string,
  input: unknown,
): Promise<ResultActionState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { homeScore, awayScore, matchNotes, scorers, cards, homeTeamId, awayTeamId } =
    parsed.data;

  const homeScorers = scorers.filter((s) => s.competitionTeamId === homeTeamId).length;
  const awayScorers = scorers.filter((s) => s.competitionTeamId === awayTeamId).length;
  if (homeScorers > homeScore) {
    return { error: `Too many home scorers (${homeScorers}) for the score (${homeScore}).` };
  }
  if (awayScorers > awayScore) {
    return { error: `Too many away scorers (${awayScorers}) for the score (${awayScore}).` };
  }

  const { error: updateError } = await supabase
    .from("results")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      match_notes: matchNotes ?? null,
    })
    .eq("id", resultId);

  if (updateError) {
    return { error: "Failed to update result. Try again." };
  }

  // Single-user app — no race-condition risk on the delete-then-insert pattern.
  await supabase.from("goals").delete().eq("result_id", resultId);

  if (scorers.length > 0) {
    const { error: goalsError } = await supabase.from("goals").insert(
      scorers.map((s) => ({
        result_id: resultId,
        competition_team_id: s.competitionTeamId,
        player_id: s.playerId,
        minute: s.minute,
        is_own_goal: s.isOwnGoal,
      })),
    );
    if (goalsError) {
      return { error: "Scores saved but scorers failed. Please re-enter scorers." };
    }
  }

  // Cards are keyed by fixture_id, not result_id.
  await supabase.from("cards").delete().eq("fixture_id", fixtureId);

  if (cards.length > 0) {
    const { error: cardsError } = await supabase.from("cards").insert(
      cards.map((c) => ({
        fixture_id: fixtureId,
        player_id: c.playerId,
        card_type: c.cardType,
        minute: c.minute,
        note: c.note ?? null,
        created_by: user.id,
      })),
    );
    if (cardsError) {
      console.error("cards insert error (update):", cardsError);
      return { error: "Scores saved but cards failed. Please re-enter cards." };
    }
  }

  revalidatePath(`/fixtures/${fixtureId}/result`);
  revalidatePath("/fixtures");
  revalidatePath("/standings");
  redirect(`/fixtures/${fixtureId}/result`);
}

export async function deleteResult(
  resultId: string,
  fixtureId: string,
): Promise<never> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Cards FK to fixture_id — not cascade-deleted with the result row.
  await supabase.from("cards").delete().eq("fixture_id", fixtureId);
  await supabase.from("results").delete().eq("id", resultId);

  revalidatePath(`/fixtures/${fixtureId}/result`);
  revalidatePath("/fixtures");
  revalidatePath("/standings");
  redirect("/fixtures");
}
