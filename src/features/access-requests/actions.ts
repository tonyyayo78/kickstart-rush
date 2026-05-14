"use server";
import { z } from "zod";
import { createAnonPublicClient } from "@/lib/supabase/anon-public";

const ROLES = [
  "head_coach",
  "assistant_coach",
  "team_manager",
  "technical_staff",
  "parent",
  "other",
] as const;

const schema = z.object({
  first_name: z.string().min(1, "Required").max(80).trim(),
  last_name: z.string().min(1, "Required").max(80).trim(),
  email: z
    .string()
    .min(1, "Required")
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  role: z.enum(ROLES, { message: "Select a role" }),
  team_ids: z
    .array(z.string().uuid("Invalid team"))
    .min(1, "Select at least one team"),
  notes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : String(v)),
    z.string().max(500).nullable(),
  ),
});

export type RequestAccessState = {
  success?: boolean;
  errors?: Partial<Record<string, string[]>>;
  message?: string;
} | null;

export async function submitAccessRequest(
  _prev: RequestAccessState,
  formData: FormData,
): Promise<RequestAccessState> {
  const website = (formData.get("website") as string) ?? "";
  // Honeypot: non-empty means a bot filled the hidden field
  if (website) return { success: true };

  const raw = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    role: formData.get("role"),
    team_ids: formData.getAll("team_ids"),
    notes: formData.get("notes"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { first_name, last_name, email, role, team_ids, notes } = parsed.data;

  const supabase = await createAnonPublicClient();

  // Duplicate suppression — same email already pending
  const { data: alreadyPending, error: dupErr } = await supabase.rpc(
    "fn_access_request_email_pending",
    { p_email: email },
  );
  if (dupErr) return { message: "Something went wrong. Please try again." };
  if (alreadyPending) return { success: true };

  const { data: newRequest, error: reqErr } = await supabase
    .from("access_requests")
    .insert({ first_name, last_name, email, role, notes, status: "pending" })
    .select("id")
    .single();

  if (reqErr || !newRequest) {
    console.error("access_requests insert error:", reqErr);
    return { message: "Failed to submit your request. Please try again." };
  }

  const teamRows = team_ids.map((squad_id) => ({
    request_id: newRequest.id,
    squad_id,
  }));

  const { error: teamErr } = await supabase
    .from("access_request_teams")
    .insert(teamRows);

  if (teamErr) {
    console.error("access_request_teams insert error:", teamErr);
    return { message: "Failed to submit your request. Please try again." };
  }

  return { success: true };
}
