"use client";
import { useMemo, useState } from "react";
import { approveRequest, denyRequest } from "../actions";

export type PendingRequest = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  notes: string | null;
  requested_at: string;
  squads: string;
};

export type DecidedRequest = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  decided_at: string | null;
  squads: string;
  decidedByName: string | null;
};

type SortKey = "requested_at" | "first_name" | "email" | "role";

function rel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(ms / 86_400_000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function abs(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function DecidedPill({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-success/10 text-success border border-success/20"
      : "bg-muted text-muted-foreground border border-border";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function SortTh({
  col, label, sortKey, sortDir, onSort,
}: {
  col: SortKey; label: string; sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
    >
      {label}
      <span className="ml-1 font-normal">
        {active ? (sortDir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
      </span>
    </th>
  );
}

export function RequestsTable({
  rows,
  historyRows,
}: {
  rows: PendingRequest[];
  historyRows: DecidedRequest[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("requested_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        !q ||
        r.email.toLowerCase().includes(q) ||
        r.first_name.toLowerCase().includes(q) ||
        r.last_name.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.squads.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const v = (r: PendingRequest) =>
        sortKey === "requested_at" ? r.requested_at
        : sortKey === "first_name" ? `${r.first_name} ${r.last_name}`
        : sortKey === "email"      ? r.email
        : r.role;
      const cmp = v(a).localeCompare(v(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      {/* Pending */}
      <div className="flex justify-end p-3 border-b border-border">
        <input
          type="search"
          placeholder="Search…"
          value={rawSearch}
          onChange={(e) => {
            setRawSearch(e.target.value);
            clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
            (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(
              () => setSearch(e.target.value),
              200,
            );
          }}
          className="w-52 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {sorted.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {search ? "No requests match your search." : "No pending requests. New requests will appear here."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border bg-muted/40 text-left">
                <SortTh col="requested_at" label="Submitted" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="first_name"   label="Name"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="email"        label="Email"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="role"         label="Role"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Squads</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground tabular-nums" title={abs(r.requested_at)}>
                    {rel(r.requested_at)}
                  </td>
                  <td className="px-4 py-2 font-medium text-foreground">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.role}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.squads || "—"}</td>
                  <td className="px-4 py-2 max-w-xs text-xs text-muted-foreground/70 italic truncate">
                    {r.notes ? `"${r.notes}"` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <form action={approveRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-all duration-150 hover:bg-gradient-to-br hover:from-primary hover:to-[hsl(219_70%_30%)] active:scale-[0.98]"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={denyRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-destructive/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/10"
                        >
                          Deny
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Decided history */}
      {historyRows.length > 0 && (
        <details className="border-t border-border">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Decided recently ({historyRows.length})
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Squads</th>
                  <th className="px-4 py-3 font-semibold">Decision</th>
                  <th className="px-4 py-3 font-semibold">Decided</th>
                  <th className="px-4 py-3 font-semibold">By</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.role}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.squads || "—"}</td>
                    <td className="px-4 py-2">
                      <DecidedPill status={r.status} />
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground tabular-nums" title={r.decided_at ? abs(r.decided_at) : ""}>
                      {r.decided_at ? rel(r.decided_at) : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.decidedByName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
