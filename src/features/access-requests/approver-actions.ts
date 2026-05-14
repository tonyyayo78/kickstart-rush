"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertApprover() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_approver")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approver) redirect("/dashboard");
  return { userId: user.id };
}

function errorRedirect(msg: string): never {
  redirect(`/admin/access-requests?error=${encodeURIComponent(msg)}`);
}

export async function approveRequest(formData: FormData): Promise<void> {
  const requestId = formData.get("request_id") as string;
  if (!requestId) redirect("/admin/access-requests");

  const { userId } = await assertApprover();
  const admin = createAdminClient();

  const { data: request, error: reqErr } = await admin
    .from("access_requests")
    .select("email, first_name, last_name, role, status, access_request_teams(squad_id)")
    .eq("id", requestId)
    .single();

  if (reqErr || !request) errorRedirect("Request not found.");
  if (request.status !== "pending") errorRedirect("Request is no longer pending.");

  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(request.email);

  if (inviteErr || !invited.user) {
    errorRedirect(
      `Failed to send invite: ${inviteErr?.message ?? "unknown error"}. No changes made.`,
    );
  }

  const newUserId = invited.user.id;
  const displayName =
    [request.first_name, request.last_name].filter(Boolean).join(" ") ||
    request.email;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: newUserId,
    email: request.email,
    first_name: request.first_name ?? null,
    display_name: displayName,
    role: request.role,
    status: "active",
    is_approver: false,
  });

  if (profileErr) {
    errorRedirect(
      `Invite sent but profile creation failed: ${profileErr.message}. Check manually.`,
    );
  }

  const squadIds = (
    request.access_request_teams as { squad_id: string }[]
  ).map((t) => t.squad_id);

  if (squadIds.length > 0) {
    const { error: teamsErr } = await admin.from("profile_teams").insert(
      squadIds.map((squad_id) => ({ profile_id: newUserId, squad_id })),
    );
    if (teamsErr) {
      errorRedirect(
        `Profile created but team linking failed: ${teamsErr.message}. Check manually.`,
      );
    }
  }

  await admin
    .from("access_requests")
    .update({
      status: "approved",
      decided_at: new Date().toISOString(),
      decided_by: userId,
    })
    .eq("id", requestId);

  revalidatePath("/admin/access-requests");
  redirect("/admin/access-requests");
}

export async function denyRequest(formData: FormData): Promise<void> {
  const requestId = formData.get("request_id") as string;
  if (!requestId) redirect("/admin/access-requests");

  const { userId } = await assertApprover();
  const admin = createAdminClient();

  const { error } = await admin
    .from("access_requests")
    .update({
      status: "denied",
      decided_at: new Date().toISOString(),
      decided_by: userId,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) errorRedirect("Failed to deny request. Try again.");

  revalidatePath("/admin/access-requests");
  redirect("/admin/access-requests");
}
