import { requireApprover } from "@/lib/auth/require-approver";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserActions } from "./UserActions";
import type { User } from "@supabase/supabase-js";

type Squad = { code: string; name: string } | null;
type ProfileTeam = { squad_id: string; squads: Squad };
type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  role: string | null;
  status: string | null;
  is_approver: boolean;
  last_active_at: string | null;
  profile_teams: ProfileTeam[];
};

type UserStatus = "suspended" | "invited" | "active-now" | "active" | "idle";

function resolveStatus(profile: Profile, authUser: User | undefined): UserStatus {
  const now = Date.now();
  if (authUser?.banned_until && new Date(authUser.banned_until).getTime() > now) {
    return "suspended";
  }
  if (!authUser?.email_confirmed_at) return "invited";
  if (
    profile.last_active_at &&
    now - new Date(profile.last_active_at).getTime() < 5 * 60 * 1000
  ) {
    return "active-now";
  }
  if (
    authUser?.last_sign_in_at &&
    now - new Date(authUser.last_sign_in_at).getTime() < 30 * 24 * 60 * 60 * 1000
  ) {
    return "active";
  }
  return "idle";
}

const STATUS_CONFIG: Record<UserStatus, { label: string; cls: string }> = {
  suspended:   { label: "Suspended",        cls: "bg-red-100 text-red-700" },
  invited:     { label: "Invited",           cls: "bg-yellow-100 text-yellow-800" },
  "active-now":{ label: "Active now",        cls: "bg-green-100 text-green-800" },
  active:      { label: "Active",            cls: "bg-blue-100 text-blue-700" },
  idle:        { label: "Idle",              cls: "bg-zinc-100 text-zinc-500" },
};

function StatusBadge({ status }: { status: UserStatus }) {
  const { label, cls } = STATUS_CONFIG[status];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);
  if (mins  < 2)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminUsersPage() {
  const approver = await requireApprover();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, email, display_name, first_name, role, status, is_approver, last_active_at, profile_teams(squad_id, squads(code, name))",
      )
      .order("display_name", { ascending: true })
      .returns<Profile[]>(),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const authById = new Map<string, User>(
    (authData?.users ?? []).map((u) => [u.id, u]),
  );

  const rows = (profiles ?? []).map((p) => ({
    profile: p,
    authUser: authById.get(p.id),
    status: resolveStatus(p, authById.get(p.id)),
    squads: p.profile_teams
      .map((t) => t.squads?.code ?? t.squad_id)
      .join(", ") || "—",
    displayName: p.display_name ?? p.first_name ?? p.email,
  }));

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Users
      </h1>
      <div className="mt-2 mb-8 h-1 w-16 bg-[#FFC726]" />

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Name / Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Squads</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last sign-in</th>
              <th className="px-4 py-3 font-semibold">Last active</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ profile, authUser, status, squads, displayName }) => (
              <tr
                key={profile.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-zinc-900">{displayName}</p>
                  <p className="text-xs text-zinc-400">{profile.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {profile.is_approver ? (
                    <span className="text-xs font-semibold text-[#00267F]">Approver</span>
                  ) : (
                    profile.role ?? "—"
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600">{squads}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={status} />
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {formatDate(authUser?.last_sign_in_at)}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {formatDate(profile.last_active_at)}
                </td>
                <td className="px-4 py-3">
                  <UserActions
                    userId={profile.id}
                    isSuspended={status === "suspended"}
                    isSelf={profile.id === approver.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
