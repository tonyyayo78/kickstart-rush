import { requireApprover } from "@/lib/auth/require-approver";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";
import { resolveStatus } from "./_components/status-pill";
import { RequestsTable } from "./_components/requests-table";
import { ActiveTable } from "./_components/active-table";
import { SuspendedTable } from "./_components/suspended-table";
import { RemovedTable } from "./_components/removed-table";
import type { DecidedRequest } from "./_components/requests-table";

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

type PendingRequestRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  notes: string | null;
  requested_at: string;
  access_request_teams: { squads: { name: string } | null }[];
};

type DecidedRequestRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  decided_at: string | null;
  access_request_teams: { squads: { name: string } | null }[];
  decider: { email: string; display_name: string | null } | null;
};

const TABS = ["requests", "active", "suspended", "removed"] as const;
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

  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profiles },
    { data: authData },
    { data: pendingReqs },
    { data: decidedReqs },
  ] = await Promise.all([
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
      .returns<PendingRequestRow[]>(),
    admin
      .from("access_requests")
      .select(
        "id, email, first_name, last_name, role, status, decided_at, access_request_teams(squads(name)), decider:profiles!decided_by(email, display_name)",
      )
      .in("status", ["approved", "denied"])
      .gte("decided_at", thirtyDaysAgo)
      .order("decided_at", { ascending: false })
      .limit(50)
      .returns<DecidedRequestRow[]>(),
  ]);

  const allProfiles = profiles ?? [];
  const authUsers: User[] = authData?.users ?? [];
  const pending = pendingReqs ?? [];
  const decided = decidedReqs ?? [];

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
    requests: pending.length,
    active: active.length,
    suspended: suspended.length,
    removed: removed.length,
  };

  const { tab: rawTab = "" } = await searchParams;
  const tab: Tab =
    TABS.includes(rawTab as Tab)
      ? (rawTab as Tab)
      : counts.requests > 0
        ? "requests"
        : "active";

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

  const historyRows: DecidedRequest[] = decided.map((r) => ({
    id: r.id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    role: r.role,
    status: r.status,
    decided_at: r.decided_at,
    squads: r.access_request_teams.map((t) => t.squads?.name ?? "").filter(Boolean).join(", "),
    decidedByName: r.decider?.display_name ?? r.decider?.email ?? null,
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
      status: resolveStatus(
        a?.banned_until,
        a?.email_confirmed_at,
        p.last_active_at,
        a?.last_sign_in_at,
      ),
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

  const TAB_LABELS: Record<Tab, string> = {
    requests:  "Requests",
    active:    "Active",
    suspended: "Suspended",
    removed:   "Removed",
  };

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        User Admin
      </h1>
      <div className="mt-2 mb-6 h-1 w-12 rounded-full bg-accent" />

      {/* Tab strip */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <a
            key={t}
            href={`?tab=${t}`}
            className={`relative flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors -mb-px ${
              tab === t
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
            <span
              className={`rounded px-1.5 py-0.5 text-xs ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[t]}
            </span>
          </a>
        ))}
      </div>

      {/* Table panel */}
      <div className="rounded-b-xl rounded-tr-xl border border-t-0 border-border bg-card shadow-card">
        {tab === "requests"  && <RequestsTable rows={pendingRows} historyRows={historyRows} />}
        {tab === "active"    && <ActiveTable rows={activeRows} approverId={approver.id} />}
        {tab === "suspended" && <SuspendedTable rows={suspendedRows} />}
        {tab === "removed"   && <RemovedTable rows={removedRows} />}
      </div>
    </div>
  );
}
