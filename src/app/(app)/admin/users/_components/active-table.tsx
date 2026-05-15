"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { forceLogout, suspend, remove } from "../actions";
import { StatusPill } from "./status-pill";
import type { UserStatus } from "./status-pill";

export type ActiveUser = {
  id: string;
  email: string;
  displayName: string;
  role: string | null;
  isApprover: boolean;
  squads: string;
  lastActiveAt: string | null;
  lastSignInAt: string | null;
  status: UserStatus;
};

type SortKey = "displayName" | "email" | "role" | "status" | "lastSignInAt" | "lastActiveAt";

function rel(iso: string | null | undefined): string {
  if (!iso) return "—";
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

function abs(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function SortTh({
  col, label, sortKey, sortDir, onSort,
}: {
  col: SortKey; label: string; sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th onClick={() => onSort(col)} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
      {label}
      <span className="ml-1 font-normal">
        {active ? (sortDir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
      </span>
    </th>
  );
}

function RowMenu({ user, approverId }: { user: ActiveUser; approverId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isSelf = user.id === approverId;

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (isSelf) {
    return (
      <span title="Cannot modify your own account" className="cursor-default text-muted-foreground/30 text-lg select-none">⋯</span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Row actions"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-popover py-1 shadow-card-elevated">
          <form action={forceLogout} onClick={() => setOpen(false)}>
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit" className="w-full px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-muted">
              Force logout
            </button>
          </form>
          <form action={suspend} onClick={() => setOpen(false)}>
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit" className="w-full px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-muted">
              Suspend
            </button>
          </form>
          <div className="my-1 border-t border-border" />
          <form action={remove} onClick={() => setOpen(false)}>
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit" className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10">
              Remove
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function ActiveTable({ rows, approverId }: { rows: ActiveUser[]; approverId: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("displayName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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
        r.displayName.toLowerCase().includes(q) ||
        (r.role?.toLowerCase().includes(q) ?? false) ||
        r.squads.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const v = (r: ActiveUser) =>
        sortKey === "displayName" ? r.displayName
        : sortKey === "email"       ? r.email
        : sortKey === "role"        ? (r.role ?? "")
        : sortKey === "status"      ? r.status
        : sortKey === "lastSignInAt"? (r.lastSignInAt ?? "")
        : (r.lastActiveAt ?? "");
      const cmp = v(a).localeCompare(v(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <div className="flex justify-end p-3 border-b border-border">
        <input
          type="search"
          placeholder="Search…"
          value={rawSearch}
          onChange={(e) => {
            setRawSearch(e.target.value);
            clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
            (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setSearch(e.target.value), 200);
          }}
          className="w-52 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {sorted.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {search ? "No users match your search." : "No active users."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border bg-muted/40 text-left">
                <SortTh col="email"        label="Email"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="displayName"  label="Name"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="role"         label="Role"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Squads</th>
                <SortTh col="status"       label="Status"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="lastSignInAt" label="Last sign-in" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="lastActiveAt" label="Last active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2 font-medium text-foreground">
                    {u.displayName}
                    {u.isApprover && (
                      <span className="ml-1 text-xs font-normal text-primary">(approver)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{u.role ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.squads || "—"}</td>
                  <td className="px-4 py-2"><StatusPill status={u.status} /></td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground tabular-nums" title={abs(u.lastSignInAt)}>
                    {rel(u.lastSignInAt)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground tabular-nums" title={abs(u.lastActiveAt)}>
                    {rel(u.lastActiveAt)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <RowMenu user={u} approverId={approverId} />
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
