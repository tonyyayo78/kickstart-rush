"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { FORMATION_IDS } from "@/lib/formations";

const PlayerSlotSchema = z.object({
  playerId: z.string().uuid(),
  role: z.enum(["starter", "sub"]),
  positionLabel: z.string().nullable(),
  slotOrder: z.number().int().min(1).max(11),
});

const SaveLineupSchema = z.object({
  fixtureId: z.string().uuid(),
  formation: z.enum([...FORMATION_IDS]),
  players: z.array(PlayerSlotSchema),
});

type SaveLineupInput = z.infer<typeof SaveLineupSchema>;

export async function saveLineup(
  input: SaveLineupInput,
): Promise<{ error: string } | { success: true }> {
  const parsed = SaveLineupSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { fixtureId, formation, players } = parsed.data;
  const supabase = await createServerClient();

  const { data: lineup, error: lineupErr } = await supabase
    .from("lineups")
    .upsert(
      { fixture_id: fixtureId, formation },
      { onConflict: "fixture_id" },
    )
    .select("id")
    .single();

  if (lineupErr || !lineup) {
    return { error: lineupErr?.message ?? "Failed to save lineup" };
  }

  await supabase.from("lineup_players").delete().eq("lineup_id", lineup.id);

  if (players.length > 0) {
    const { error: insertErr } = await supabase.from("lineup_players").insert(
      players.map((p) => ({
        lineup_id: lineup.id,
        player_id: p.playerId,
        role: p.role,
        position_label: p.positionLabel,
        slot_order: p.slotOrder,
      })),
    );
    if (insertErr) return { error: insertErr.message };
  }

  revalidatePath(`/fixtures/${fixtureId}/lineup`);
  revalidatePath("/fixtures");
  return { success: true };
}
