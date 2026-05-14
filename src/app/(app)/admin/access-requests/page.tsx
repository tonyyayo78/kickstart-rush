import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveRequest, denyRequest } from "@/features/access-requests/approver-actions";

type Squad = { name: string };
type RequestTeam = { squad_id: string; squads: Squad | null };

type AccessRequest = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  notes: string | null;
  status: string;
  requested_at: string;
  decided_at: string | null;
  access_request_teams: RequestTeam[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TeamList({ teams }: { teams: RequestTeam[] }) {
  const names = teams.map((t) => t.squads?.name ?? t.squad_id);
  if (!names.length) return <span className="text-zinc-400">—</span>;
  return <span>{names.join(", ")}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-green-100 text-green-800"
      : status === "denied"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-800";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

export default async function AccessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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

  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("access_requests")
    .select(
      "id, first_name, last_name, email, role, notes, status, requested_at, decided_at, access_request_teams(squad_id, squads(name))",
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
    .returns<AccessRequest[]>();

  const { data: decided } = await admin
    .from("access_requests")
    .select(
      "id, first_name, last_name, email, role, notes, status, requested_at, decided_at, access_request_teams(squad_id, squads(name))",
    )
    .in("status", ["approved", "denied"])
    .order("decided_at", { ascending: false })
    .limit(50)
    .returns<AccessRequest[]>();

  const pendingList = pending ?? [];
  const decidedList = decided ?? [];
  const { error: actionError } = await searchParams;

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Access Requests
      </h1>
      <div className="mt-2 mb-8 h-1 w-16 bg-[#FFC726]" />

      {actionError && (
        <p role="alert" className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {/* Pending */}
      <section>
        <h2 className="mb-4 text-lg font-bold uppercase tracking-tight">
          Pending
          {pendingList.length > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#00267F] text-xs font-bold text-white">
              {pendingList.length}
            </span>
          )}
        </h2>

        {pendingList.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending requests.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingList.map((req) => {
              const name =
                [req.first_name, req.last_name].filter(Boolean).join(" ") || req.email;
              return (
                <div
                  key={req.id}
                  className="rounded-lg border border-zinc-200 bg-white p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="font-bold">{name}</p>
                      <p className="text-sm text-zinc-600">{req.email}</p>
                      <p className="text-sm text-zinc-600">
                        <span className="font-medium">Role:</span> {req.role}
                      </p>
                      <p className="text-sm text-zinc-600">
                        <span className="font-medium">Team(s):</span>{" "}
                        <TeamList teams={req.access_request_teams} />
                      </p>
                      {req.notes && (
                        <p className="mt-1 text-sm text-zinc-500 italic">
                          &ldquo;{req.notes}&rdquo;
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        Requested {formatDate(req.requested_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
                      <form action={approveRequest}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-[#00267F] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#3349A3]"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={denyRequest}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-700 transition-colors hover:bg-red-50"
                        >
                          Deny
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Decided history */}
      {decidedList.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-800">
            History ({decidedList.length})
          </summary>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Team(s)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Decided</th>
                </tr>
              </thead>
              <tbody>
                {decidedList.map((req) => {
                  const name =
                    [req.first_name, req.last_name].filter(Boolean).join(" ") || req.email;
                  return (
                    <tr key={req.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-3 font-medium">{name}</td>
                      <td className="px-4 py-3 text-zinc-600">{req.email}</td>
                      <td className="px-4 py-3 text-zinc-600">{req.role}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        <TeamList teams={req.access_request_teams} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {req.decided_at ? formatDate(req.decided_at) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
