"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email/send-invite";

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

function generateTempPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Kickstart-${digits}`;
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

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: request.email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    console.error("[approveRequest] createUser failed:", createErr);
    errorRedirect(
      `Failed to create account: ${createErr?.message ?? "unknown error"}. No changes made.`,
    );
  }

  const newUserId = created.user.id;
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
    must_change_password: true,
  });

  if (profileErr) {
    console.error("[approveRequest] profile insert failed:", profileErr);
    errorRedirect(
      `Account created but profile creation failed: ${profileErr.message}. Check manually.`,
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
      console.error("[approveRequest] profile_teams insert failed:", teamsErr);
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

  const emailResult = await sendInviteEmail({
    to: request.email,
    firstName: request.first_name ?? null,
    tempPassword,
    signInUrl: "https://kickstart-rush.vercel.app/sign-in",
  });

  if (!emailResult.ok) {
    console.error("[approveRequest] invite email failed:", emailResult.error);
    revalidatePath("/admin/access-requests");
    redirect(
      `/admin/access-requests?warning=${encodeURIComponent(
        `Account approved but invite email failed: ${emailResult.error}. Share credentials manually: ${request.email} / ${tempPassword}`,
      )}`,
    );
  }

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
