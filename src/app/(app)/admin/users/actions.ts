"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprover } from "@/lib/auth/require-approver";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { env } from "@/lib/env";

const REVALIDATE = () => revalidatePath("/admin/users");

async function writeAudit(
  actorId: string,
  action: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
): Promise<number | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit_log")
    .insert({ actor_id: actorId, action, target_id: targetId, metadata: metadata ?? null })
    .select("id")
    .single();
  return (data as { id: number } | null)?.id ?? null;
}

function selfGuard(approverId: string, targetId: string) {
  if (approverId === targetId) {
    throw new Error("You cannot perform admin actions on your own account.");
  }
}

/**
 * Generates a 12-char temp password using CSPRNG, avoiding visually ambiguous
 * characters (0/O, 1/l/I). User must change on first login.
 */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) {
    out += alphabet[arr[i] % alphabet.length];
  }
  return out;
}

export async function approveRequest(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const requestId = formData.get("requestId") as string;
  if (!requestId) return;

  const admin = createAdminClient();

  const { data: req, error: reqErr } = await admin
    .from("access_requests")
    .select("id, email, first_name, last_name, role, status, access_request_teams(squad_id)")
    .eq("id", requestId)
    .single();

  if (reqErr || !req) throw new Error("Request not found.");
  if (req.status !== "pending") throw new Error("Request is no longer pending.");

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: req.email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(`User creation failed: ${createErr?.message ?? "unknown error"}`);
  }

  const newUserId = created.user.id;
  const displayName =
    [req.first_name, req.last_name].filter(Boolean).join(" ") || req.email;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: newUserId,
    email: req.email,
    first_name: req.first_name ?? null,
    display_name: displayName,
    role: req.role,
    status: "active",
    is_approver: false,
    must_change_password: true,
  });

  if (profileErr) {
    console.error("[approveRequest] profile insert failed:", profileErr);
    try {
      await admin.auth.admin.deleteUser(newUserId);
    } catch (e) {
      console.error("[approveRequest] orphan cleanup failed:", e);
    }
    throw new Error(`Profile creation failed: ${profileErr.message}`);
  }

  // Approver may override the requested squads via form-supplied squadIds[].
  // Fall back to access_request_teams if no override is provided.
  const overrideSquadIds = formData.getAll("squadIds").filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  const requestedSquadIds = (req.access_request_teams as { squad_id: string }[]).map(
    (t) => t.squad_id,
  );
  const squadIds = overrideSquadIds.length > 0 ? overrideSquadIds : requestedSquadIds;

  if (squadIds.length > 0) {
    const { error: teamsErr } = await admin
      .from("profile_teams")
      .insert(squadIds.map((squad_id) => ({ profile_id: newUserId, squad_id })));
    if (teamsErr) {
      console.error("[approveRequest] teams insert failed:", teamsErr);
      try {
        await admin.auth.admin.deleteUser(newUserId);
      } catch (e) {
        console.error("[approveRequest] orphan cleanup failed:", e);
      }
      throw new Error(`Team linking failed: ${teamsErr.message}`);
    }
  }

  await admin
    .from("access_requests")
    .update({
      status: "approved",
      decided_at: new Date().toISOString(),
      decided_by: approver.id,
    })
    .eq("id", requestId);

  const signInUrl = `${env.NEXT_PUBLIC_APP_URL ?? "https://kickstart-rush.vercel.app"}/sign-in`;
  const emailResult = await sendInviteEmail({
    to: req.email,
    firstName: req.first_name ?? null,
    tempPassword,
    signInUrl,
  });

  await writeAudit(approver.id, "admin.approve_request", newUserId, {
    request_id: requestId,
    requested_squads: requestedSquadIds,
    granted_squads: squadIds,
    overrode_request: overrideSquadIds.length > 0,
    email_sent: emailResult.ok,
    email_message_id: emailResult.ok ? emailResult.messageId : null,
    email_error: emailResult.ok ? null : emailResult.error,
  });

  REVALIDATE();

  if (!emailResult.ok) {
    redirect(
      `/admin/users?warning=${encodeURIComponent(
        `User created but invite email failed. Send manually: ${req.email} / ${tempPassword}`,
      )}`,
    );
  }
}

export async function denyRequest(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const requestId = formData.get("requestId") as string;
  if (!requestId) return;

  const admin = createAdminClient();
  await admin
    .from("access_requests")
    .update({
      status: "denied",
      decided_at: new Date().toISOString(),
      decided_by: approver.id,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  await writeAudit(approver.id, "admin.deny_request", null, { request_id: requestId });
  REVALIDATE();
}

export async function forceLogout(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfGuard(approver.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.signOut(userId, "global");
  if (error) throw new Error(`Force logout failed: ${error.message}`);

  await writeAudit(approver.id, "admin.force_logout", userId);
  REVALIDATE();
}

export async function suspend(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfGuard(approver.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (error) throw new Error(`Suspend failed: ${error.message}`);

  await writeAudit(approver.id, "admin.suspend", userId);
  REVALIDATE();
}

export async function reactivate(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfGuard(approver.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) throw new Error(`Reactivate failed: ${error.message}`);

  await writeAudit(approver.id, "admin.reactivate", userId);
  REVALIDATE();
}

export async function remove(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfGuard(approver.id, userId);

  const admin = createAdminClient();

  const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (banErr) throw new Error(`Remove (ban) failed: ${banErr.message}`);

  await admin.auth.admin.signOut(userId, "global");

  const { error: teamsErr } = await admin
    .from("profile_teams")
    .delete()
    .eq("profile_id", userId);
  if (teamsErr) throw new Error(`Remove (teams) failed: ${teamsErr.message}`);

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", userId);
  if (profileErr) throw new Error(`Remove (profile) failed: ${profileErr.message}`);

  await writeAudit(approver.id, "admin.remove", userId);
  REVALIDATE();
}

export async function restore(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfGuard(approver.id, userId);

  const admin = createAdminClient();

  const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (banErr) throw new Error(`Restore (unban) failed: ${banErr.message}`);

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ removed_at: null })
    .eq("id", userId);
  if (profileErr) throw new Error(`Restore (profile) failed: ${profileErr.message}`);

  await writeAudit(approver.id, "admin.restore", userId);
  REVALIDATE();
}

export async function purge(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  const confirmedEmail = ((formData.get("confirmedEmail") as string) ?? "")
    .trim()
    .toLowerCase();
  if (!userId || !confirmedEmail) return;
  selfGuard(approver.id, userId);

  const admin = createAdminClient();

  const { data: authData, error: fetchErr } = await admin.auth.admin.getUserById(userId);
  if (fetchErr || !authData.user) throw new Error("User not found.");

  const actualEmail = (authData.user.email ?? "").toLowerCase();
  if (confirmedEmail !== actualEmail) {
    throw new Error("Email confirmation does not match. Purge cancelled.");
  }

  // Write audit BEFORE delete so actor_id and target_id are valid
  const auditId = await writeAudit(approver.id, "admin.purge", userId, {
    purged_email: actualEmail,
    purged_at: new Date().toISOString(),
  });

  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    if (auditId) {
      await admin
        .from("admin_audit_log")
        .update({
          metadata: {
            purged_email: actualEmail,
            status: "failed",
            error: deleteErr.message,
          },
        })
        .eq("id", auditId);
    }
    throw new Error(`Purge failed: ${deleteErr.message}`);
  }

  REVALIDATE();
}

export async function updateUserSquads(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfGuard(approver.id, userId);

  const newSquadIds = formData.getAll("squadIds").filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  const admin = createAdminClient();

  // Snapshot existing squads for the audit log.
  const { data: existing } = await admin
    .from("profile_teams")
    .select("squad_id")
    .eq("profile_id", userId);
  const beforeSquadIds = ((existing ?? []) as { squad_id: string }[]).map(
    (r) => r.squad_id,
  );

  // Atomic replace: delete all rows for this profile, then insert the new set.
  const { error: clearErr } = await admin
    .from("profile_teams")
    .delete()
    .eq("profile_id", userId);
  if (clearErr) throw new Error(`Failed to clear squads: ${clearErr.message}`);

  if (newSquadIds.length > 0) {
    const { error: insertErr } = await admin
      .from("profile_teams")
      .insert(newSquadIds.map((squad_id) => ({ profile_id: userId, squad_id })));
    if (insertErr) {
      throw new Error(`Failed to set squads: ${insertErr.message}`);
    }
  }

  await writeAudit(approver.id, "admin.update_user_squads", userId, {
    before: beforeSquadIds,
    after: newSquadIds,
  });

  REVALIDATE();
}

export async function inviteUser(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const firstName = ((formData.get("firstName") as string) ?? "").trim();
  const lastName = ((formData.get("lastName") as string) ?? "").trim();
  const role = ((formData.get("role") as string) ?? "").trim() || "Coach";
  const squadIds = formData.getAll("squadIds").filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  if (!email) throw new Error("Email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email format is invalid.");
  }

  const admin = createAdminClient();

  // Duplicate check via direct profiles query (avoids listUsers 1000-row limit)
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingProfile) {
    throw new Error(`A user with email ${email} already exists.`);
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(`User creation failed: ${createErr?.message ?? "unknown error"}`);
  }

  const userId = created.user.id;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    email,
    first_name: firstName || null,
    display_name: displayName,
    role,
    status: "active",
    is_approver: false,
    must_change_password: true,
  });

  if (profileErr) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.error("[inviteUser] orphan cleanup failed:", e);
    }
    throw new Error(`Profile creation failed: ${profileErr.message}`);
  }

  if (squadIds.length > 0) {
    const { error: teamsErr } = await admin
      .from("profile_teams")
      .insert(squadIds.map((squad_id) => ({ profile_id: userId, squad_id })));
    if (teamsErr) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch (e) {
        console.error("[inviteUser] orphan cleanup failed:", e);
      }
      throw new Error(`Team linking failed: ${teamsErr.message}`);
    }
  }

  const signInUrl = `${env.NEXT_PUBLIC_APP_URL ?? "https://kickstart-rush.vercel.app"}/sign-in`;
  const emailResult = await sendInviteEmail({
    to: email,
    firstName: firstName || null,
    tempPassword,
    signInUrl,
  });

  await writeAudit(approver.id, "admin.invite_user", userId, {
    invited_email: email,
    granted_squads: squadIds,
    email_sent: emailResult.ok,
    email_message_id: emailResult.ok ? emailResult.messageId : null,
    email_error: emailResult.ok ? null : emailResult.error,
  });

  REVALIDATE();

  if (!emailResult.ok) {
    redirect(
      `/admin/users?warning=${encodeURIComponent(
        `User created but invite email failed. Send manually: ${email} / ${tempPassword}`,
      )}`,
    );
  }
}
