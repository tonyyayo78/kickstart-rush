"use server";
import { revalidatePath } from "next/cache";
import { requireApprover } from "@/lib/auth/require-approver";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(req.email);
  if (inviteErr || !invited.user) {
    throw new Error(`Invite failed: ${inviteErr?.message ?? "unknown error"}`);
  }

  const newUserId = invited.user.id;
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

  const squadIds = (req.access_request_teams as { squad_id: string }[]).map(
    (t) => t.squad_id,
  );

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

  await writeAudit(approver.id, "admin.approve_request", newUserId, {
    request_id: requestId,
    granted_squads: squadIds,
  });

  REVALIDATE();
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
