import { requireApprover } from "@/lib/auth/require-approver";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";
import { resolveStatus } from "./_components/status-pill";
import { PendingTable } from "./_components/pending-table";
import { ActiveTable } from "./_components/active-table";
import { SuspendedTable } from "./_components/suspended-table";
import { RemovedTable } from "./_components/removed-table";

type Squad = { code: string; name: string } | null;
type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  role: string | null;
  is_approver: boolean;
  last_active_at: string | null;
  removed_at: string | null;
  profile_teams: { squads: Squad }[];
};

type AccessRequestRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  notes: string | null;
  requested_at: string;
  access_request_teams: { squads: { name: string } | null }[];
};

const TABS = ["pending", "active", "suspended", "removed"] as const;
type Tab = (typeof TABS)[number];

function squadsOf(p: ProfileRow): string {
  return p.profile_teams.map((t) => t.squads?.code ?? "").filter(Boolean).join(", ");
}

function displayNameOf(p: ProfileRow): string {
  return p.display_name ?? p.first_name ?? p.email;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const approver = await requireApprover();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authData }, { data: pendingReqs }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, email, display_name, first_name, role, is_approver, last_active_at, removed_at, profile_teams(squads(code,name))",
        )
        .order("display_name", { ascending: true })
        .returns<ProfileRow[]>(),
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin
        .from("access_requests")
        .select(
          "id, email, first_name, last_name, role, notes, requested_at, access_request_teams(squads(name))",
        )
        .eq("status", "pending")
        .order("requested_at", { ascending: true })
        .returns<AccessRequestRow[]>(),
    ]);

  const allProfiles = profiles ?? [];
  const authUsers: User[] = authData?.users ?? [];
  const pending = pendingReqs ?? [];

  const authById = new Map<string, User>(authUsers.map((u) => [u.id, u]));
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const nonRemoved = allProfiles.filter((p) => !p.removed_at);
  const removed = allProfiles.filter((p) => !!p.removed_at);

  const suspended = nonRemoved.filter((p) => {
    const a = authById.get(p.id);
    return a?.banned_until && new Date(a.banned_until).getTime() > now;
  });

  const active = nonRemoved.filter((p) => {
    const a = authById.get(p.id);
    return !a?.banned_until || new Date(a.banned_until).getTime() <= now;
  });

  const counts: Record<Tab, number> = {
    pending: pending.length,
    active: active.length,
    suspended: suspended.length,
    removed: removed.length,
  };

  const { tab: rawTab = "" } = await searchParams;
  const tab: Tab =
    TABS.includes(rawTab as Tab)
      ? (rawTab as Tab)
      : counts.pending > 0
        ? "pending"
        : "active";

  // Build table-specific data shapes

  const pendingRows = pending.map((r) => ({
    id: r.id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    role: r.role,
    notes: r.notes,
    requested_at: r.requested_at,
    squads: r.access_request_teams.map((t) => t.squads?.name ?? "").filter(Boolean).join(", "),
  }));

  const activeRows = active.map((p) => {
    const a = authById.get(p.id);
    return {
      id: p.id,
      email: p.email,
      displayName: displayNameOf(p),
      role: p.role,
      isApprover: p.is_approver,
      squads: squadsOf(p),
      lastActiveAt: p.last_active_at,
      lastSignInAt: a?.last_sign_in_at ?? null,
      status: resolveStatus(a?.banned_until, a?.email_confirmed_at, p.last_active_at, a?.last_sign_in_at),
    };
  });

  const suspendedRows = suspended.map((p) => {
    const a = authById.get(p.id);
    return {
      id: p.id,
      email: p.email,
      displayName: displayNameOf(p),
      role: p.role,
      squads: squadsOf(p),
      bannedUntil: a?.banned_until ?? null,
      lastSignInAt: a?.last_sign_in_at ?? null,
    };
  });

  const removedRows = removed.map((p) => ({
    id: p.id,
    email: p.email,
    displayName: displayNameOf(p),
    role: p.role,
    removedAt: p.removed_at,
  }));

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Users
      </h1>
      <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />

      {/* Tab strip */}
      <div className="flex border-b border-zinc-200">
        {TABS.map((t) => (
          <a
            key={t}
            href={`?tab=${t}`}
            className={`flex items-center gap-1.5 border-b-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors -mb-px ${
              tab === t
                ? "border-[#00267F] text-[#00267F]"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span
              className={`rounded px-1.5 py-0.5 text-xs ${
                tab === t
                  ? "bg-[#00267F] text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {counts[t]}
            </span>
          </a>
        ))}
      </div>

      {/* Table panel */}
      <div className="rounded-b-lg rounded-tr-lg border border-t-0 border-zinc-200 bg-white">
        {tab === "pending" && <PendingTable rows={pendingRows} />}
        {tab === "active" && <ActiveTable rows={activeRows} approverId={approver.id} />}
        {tab === "suspended" && <SuspendedTable rows={suspendedRows} />}
        {tab === "removed" && <RemovedTable rows={removedRows} />}
      </div>
    </div>
  );
}
