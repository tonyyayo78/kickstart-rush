"use server";
import { revalidatePath } from "next/cache";
import { requireApprover } from "@/lib/auth/require-approver";
import { createAdminClient } from "@/lib/supabase/admin";

const REVALIDATE = () => revalidatePath("/admin/users");

async function writeAuditLog(
  actorId: string,
  action: string,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  const admin = createAdminClient();
  await admin.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_id: targetId,
    metadata: metadata ?? null,
  });
}

function selfActionGuard(approverId: string, targetId: string) {
  if (approverId === targetId) {
    throw new Error("You cannot perform admin actions on your own account.");
  }
}

export async function forceLogout(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfActionGuard(approver.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.signOut(userId, "global");
  if (error) throw new Error(`Force logout failed: ${error.message}`);

  await writeAuditLog(approver.id, "admin.force_logout", userId);
  REVALIDATE();
}

export async function suspend(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfActionGuard(approver.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (error) throw new Error(`Suspend failed: ${error.message}`);

  await writeAuditLog(approver.id, "admin.suspend", userId);
  REVALIDATE();
}

export async function reactivate(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfActionGuard(approver.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) throw new Error(`Reactivate failed: ${error.message}`);

  await writeAuditLog(approver.id, "admin.reactivate", userId);
  REVALIDATE();
}

export async function remove(formData: FormData): Promise<void> {
  const approver = await requireApprover();
  const userId = formData.get("userId") as string;
  if (!userId) return;
  selfActionGuard(approver.id, userId);

  const admin = createAdminClient();

  // Suspend first so any active session is invalidated
  const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (banErr) throw new Error(`Remove (ban) failed: ${banErr.message}`);

  // Strip squad access — auth.users row is preserved for FK integrity
  const { error: teamsErr } = await admin
    .from("profile_teams")
    .delete()
    .eq("profile_id", userId);
  if (teamsErr) throw new Error(`Remove (teams) failed: ${teamsErr.message}`);

  await writeAuditLog(approver.id, "admin.remove", userId);
  REVALIDATE();
}
