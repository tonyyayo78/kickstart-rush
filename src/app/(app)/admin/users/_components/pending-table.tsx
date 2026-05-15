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

function SortTh({
  col,
  label,
  sortKey,
  sortDir,
  onSort,
}: {
  col: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-800"
    >
      {label}
      <span className="ml-1 font-normal">
        {active ? (sortDir === "asc" ? "↑" : "↓") : <span className="text-zinc-300">↕</span>}
      </span>
    </th>
  );
}

export function PendingTable({ rows }: { rows: PendingRequest[] }) {
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
        : sortKey === "email" ? r.email
        : r.role;
      const cmp = v(a).localeCompare(v(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <div className="flex justify-end p-3 border-b border-zinc-100">
        <input
          type="search"
          placeholder="Search…"
          value={rawSearch}
          onChange={(e) => {
            setRawSearch(e.target.value);
            clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
            (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setSearch(e.target.value), 200);
          }}
          className="w-52 rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]"
        />
      </div>

      {sorted.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400">
          {search ? "No requests match your search." : "No pending requests."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="border-b border-zinc-200 text-left">
                <SortTh col="requested_at" label="Submitted" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="first_name"   label="Name"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="email"        label="Email"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="role"         label="Role"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Squads
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Message
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500 tabular-nums" title={abs(r.requested_at)}>
                    {rel(r.requested_at)}
                  </td>
                  <td className="px-4 py-2 font-medium text-zinc-900">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{r.email}</td>
                  <td className="px-4 py-2 text-zinc-600">{r.role}</td>
                  <td className="px-4 py-2 text-zinc-600">{r.squads || "—"}</td>
                  <td className="px-4 py-2 max-w-xs text-xs text-zinc-400 italic truncate">
                    {r.notes ? `"${r.notes}"` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <form action={approveRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-[#00267F] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#3349A3]"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={denyRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-300 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700 hover:bg-red-50"
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
    </div>
  );
}
