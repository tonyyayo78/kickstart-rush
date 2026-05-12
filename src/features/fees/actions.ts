"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

async function getAuthUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return { supabase, userId: user.id };
}

function revalidate(fixtureId: string) {
  revalidatePath(`/fixtures/${fixtureId}/fees`);
  revalidatePath(`/fixtures/${fixtureId}/result`);
  revalidatePath("/fixtures");
}

export async function togglePlayerPaid(
  fixtureId: string,
  playerId: string,
): Promise<void> {
  const { supabase, userId } = await getAuthUser();

  const { data: existing } = await supabase
    .from("match_fees")
    .select("id, status")
    .eq("fixture_id", fixtureId)
    .eq("player_id", playerId)
    .single();

  if (!existing) {
    const { error } = await supabase.from("match_fees").insert({
      fixture_id: fixtureId,
      player_id: playerId,
      status: "paid",
      recorded_by: userId,
    });
    if (error) throw new Error("Failed to record payment.");
  } else if (existing.status === "paid") {
    const { error } = await supabase
      .from("match_fees")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error("Failed to remove payment record.");
  } else {
    // status === 'exception' → flip to paid, clear note
    const { error } = await supabase
      .from("match_fees")
      .update({ status: "paid", note: null, recorded_by: userId })
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update payment status.");
  }

  revalidate(fixtureId);
}

export async function togglePlayerException(
  fixtureId: string,
  playerId: string,
  note: string,
): Promise<void> {
  const { supabase, userId } = await getAuthUser();

  const { data: existing } = await supabase
    .from("match_fees")
    .select("id, status")
    .eq("fixture_id", fixtureId)
    .eq("player_id", playerId)
    .single();

  if (!existing) {
    const { error } = await supabase.from("match_fees").insert({
      fixture_id: fixtureId,
      player_id: playerId,
      status: "exception",
      note: note.trim() || null,
      recorded_by: userId,
    });
    if (error) throw new Error("Failed to record exception.");
  } else if (existing.status === "exception") {
    const { error } = await supabase
      .from("match_fees")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error("Failed to remove exception record.");
  } else {
    // status === 'paid' → flip to exception
    const { error } = await supabase
      .from("match_fees")
      .update({
        status: "exception",
        note: note.trim() || null,
        recorded_by: userId,
      })
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update to exception.");
  }

  revalidate(fixtureId);
}

export async function updateExceptionNote(
  fixtureId: string,
  playerId: string,
  note: string,
): Promise<void> {
  const { supabase } = await getAuthUser();

  const { error } = await supabase
    .from("match_fees")
    .update({ note: note.trim() || null })
    .eq("fixture_id", fixtureId)
    .eq("player_id", playerId)
    .eq("status", "exception");

  if (error) throw new Error("Failed to update note.");

  revalidate(fixtureId);
}
