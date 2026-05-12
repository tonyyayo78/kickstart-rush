"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const playerSchema = z.object({
  first_name: z.string().min(1, "Required").max(100).trim(),
  last_name: z.string().min(1, "Required").max(100).trim(),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine(
      (v) =>
        new Date(v) >= new Date("2011-01-01") &&
        new Date(v) <= new Date("2013-12-31"),
      "Player must be born 2011–2013 for U15 eligibility",
    ),
  preferred_position: z.enum(["GK", "DEF", "MID", "FWD"]),
  jersey_number: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(1).max(99).nullable(),
  ),
  status: z.enum(["active", "injured", "unavailable", "inactive"]),
  notes_summary: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : String(v)),
    z.string().max(1000).nullable(),
  ),
});

export type PlayerFormState = {
  errors?: Partial<Record<string, string[]>>;
  message?: string;
} | null;

export async function createPlayer(
  squadCode: string,
  _prev: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const parsed = playerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { data: squad } = await supabase
    .from("squads")
    .select("id")
    .eq("code", squadCode)
    .single();

  if (!squad) return { message: "Squad not found." };

  const { error } = await supabase
    .from("players")
    .insert({ ...parsed.data, squad_id: squad.id });

  if (error) {
    if (error.code === "23505") {
      return {
        errors: {
          jersey_number: ["Jersey number already taken in this squad."],
        },
      };
    }
    return { message: "Failed to add player. Try again." };
  }

  revalidatePath(`/squads/${squadCode}/players`);
  redirect(`/squads/${squadCode}/players`);
}

export async function updatePlayer(
  playerId: string,
  _prev: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const parsed = playerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("players")
    .update(parsed.data)
    .eq("id", playerId);

  if (error) {
    if (error.code === "23505") {
      return {
        errors: {
          jersey_number: ["Jersey number already taken in this squad."],
        },
      };
    }
    return { message: "Failed to update player. Try again." };
  }

  revalidatePath(`/players/${playerId}`);
  redirect(`/players/${playerId}`);
}

export async function softDeletePlayer(
  playerId: string,
  squadCode: string,
): Promise<never> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await supabase
    .from("players")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", playerId);

  revalidatePath(`/squads/${squadCode}/players`);
  redirect(`/squads/${squadCode}/players`);
}
