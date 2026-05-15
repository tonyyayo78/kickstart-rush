"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { restore } from "../actions";
import { PurgeDialog } from "./purge-dialog";

export type RemovedUser = {
  id: string;
  email: string;
  displayName: string;
  role: string | null;
  removedAt: string | null;
};

type SortKey = "email" | "displayName" | "role" | "removedAt";

function abs(iso: string | null | undefined): string {
  if (!iso) return "—";
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
    <th onClick={() => onSort(col)} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-800">
      {label}
      <span className="ml-1 font-normal">
        {active ? (sortDir === "asc" ? "↑" : "↓") : <span className="text-zinc-300">↕</span>}
      </span>
    </th>
  );
}

function RowMenu({
  user,
  onPurge,
}: {
  user: RemovedUser;
  onPurge: (u: { id: string; email: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Row actions" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
          <form action={restore} onClick={() => setOpen(false)}>
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit" className="w-full px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50">
              Restore
            </button>
          </form>
          <div className="my-1 border-t border-zinc-100" />
          <button
            type="button"
            onClick={() => { setOpen(false); onPurge({ id: user.id, email: user.email }); }}
            className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Purge
          </button>
        </div>
      )}
    </div>
  );
}

export function RemovedTable({ rows }: { rows: RemovedUser[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("removedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [purgeTarget, setPurgeTarget] = useState<{ id: string; email: string } | null>(null);

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
        (r.role?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const v = (r: RemovedUser) =>
        sortKey === "email"       ? r.email
        : sortKey === "displayName" ? r.displayName
        : sortKey === "role"        ? (r.role ?? "")
        : (r.removedAt ?? "");
      const cmp = v(a).localeCompare(v(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <>
      <PurgeDialog target={purgeTarget} onClose={() => setPurgeTarget(null)} />
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
            {search ? "No removed users match your search." : "No removed users."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="border-b border-zinc-200 text-left">
                  <SortTh col="email"       label="Email"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="displayName" label="Name"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="role"        label="Role"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="removedAt"   label="Removed at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-500 line-through">{u.email}</td>
                    <td className="px-4 py-2 text-zinc-500">{u.displayName}</td>
                    <td className="px-4 py-2 text-zinc-400">{u.role ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-400 tabular-nums">{abs(u.removedAt)}</td>
                    <td className="px-4 py-2 text-right">
                      <RowMenu user={u} onPurge={setPurgeTarget} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
