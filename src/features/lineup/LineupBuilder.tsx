"use client";

import { useState, useTransition, useEffect } from "react";
import { saveLineup } from "./actions";
import type { Formation, FormationId } from "@/lib/formations";
import { DEFAULT_FORMATION } from "@/lib/formations";

type Player = {
  id: string;
  display_name: string;
  jersey_number: number | null;
  preferred_position: string | null;
};

type SavedPlayer = {
  player_id: string;
  role: "starter" | "sub";
  position_label: string | null;
  slot_order: number;
};

type Props = {
  fixtureId: string;
  players: Player[];
  formations: Formation[];
  savedFormation: string | null;
  savedPlayers: SavedPlayer[];
};

type SheetState =
  | { mode: "closed" }
  | { mode: "place"; role: "starter" | "sub"; slotOrder: number }
  | { mode: "action"; role: "starter" | "sub"; slotOrder: number };

const SUB_SLOTS = 7;

// display_name is generated as "A. Smith" — extract after ". "
function lastName(p: Player): string {
  return p.display_name.split(". ")[1] ?? p.display_name;
}

export default function LineupBuilder({
  fixtureId,
  players,
  formations,
  savedFormation,
  savedPlayers,
}: Props) {
  const [formation, setFormation] = useState<FormationId>(
    (savedFormation as FormationId | null) ??
      (formations[0].id as FormationId) ??
      DEFAULT_FORMATION,
  );

  const [starters, setStarters] = useState<Map<number, string>>(() => {
    const m = new Map<number, string>();
    for (const p of savedPlayers) {
      if (p.role === "starter") m.set(p.slot_order, p.player_id);
    }
    return m;
  });

  const [subs, setSubs] = useState<Map<number, string>>(() => {
    const m = new Map<number, string>();
    for (const p of savedPlayers) {
      if (p.role === "sub") m.set(p.slot_order, p.player_id);
    }
    return m;
  });

  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flashSaved, setFlashSaved] = useState(false);

  const currentFormation = formations.find((f) => f.id === formation) ?? formations[0];
  const playerById = new Map(players.map((p) => [p.id, p]));
  const assignedIds = new Set([...starters.values(), ...subs.values()]);

  useEffect(() => {
    if (sheet.mode !== "closed") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet.mode]);

  const handleFormationChange = (id: FormationId) => {
    setFormation(id);
    setStarters(new Map());
    setSubs(new Map());
  };

  const assignPlayer = (
    role: "starter" | "sub",
    slotOrder: number,
    playerId: string,
  ) => {
    setStarters((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) {
        if (v === playerId) next.delete(k);
      }
      if (role === "starter") next.set(slotOrder, playerId);
      return next;
    });
    setSubs((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) {
        if (v === playerId) next.delete(k);
      }
      if (role === "sub") next.set(slotOrder, playerId);
      return next;
    });
  };

  const removeFromSlot = (role: "starter" | "sub", slotOrder: number) => {
    if (role === "starter") {
      setStarters((prev) => {
        const next = new Map(prev);
        next.delete(slotOrder);
        return next;
      });
    } else {
      setSubs((prev) => {
        const next = new Map(prev);
        next.delete(slotOrder);
        return next;
      });
    }
  };

  const handleSlotTap = (role: "starter" | "sub", slotOrder: number) => {
    const map = role === "starter" ? starters : subs;
    setSheet(
      map.has(slotOrder)
        ? { mode: "action", role, slotOrder }
        : { mode: "place", role, slotOrder },
    );
  };

  const closeSheet = () => setSheet({ mode: "closed" });

  const handleSave = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const slotPlayers: Parameters<typeof saveLineup>[0]["players"] = [];

      for (const slot of currentFormation.slots) {
        const pid = starters.get(slot.slotOrder);
        if (pid) {
          slotPlayers.push({
            playerId: pid,
            role: "starter",
            positionLabel: slot.label,
            slotOrder: slot.slotOrder,
          });
        }
      }
      for (const [slotOrder, pid] of subs) {
        slotPlayers.push({
          playerId: pid,
          role: "sub",
          positionLabel: null,
          slotOrder,
        });
      }

      const result = await saveLineup({ fixtureId, formation, players: slotPlayers });
      if ("error" in result) {
        setErrorMsg(result.error);
      } else {
        setFlashSaved(true);
        setTimeout(() => setFlashSaved(false), 2000);
      }
    });
  };

  // Players sorted by jersey number (nulls last), then name
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.jersey_number == null && b.jersey_number == null)
      return a.display_name.localeCompare(b.display_name);
    if (a.jersey_number == null) return 1;
    if (b.jersey_number == null) return -1;
    return a.jersey_number - b.jersey_number;
  });

  // ── bottom sheet content ──────────────────────────────────────────────────

  let sheetContent: React.ReactNode = null;

  if (sheet.mode === "action") {
    const { role, slotOrder } = sheet;
    const map = role === "starter" ? starters : subs;
    const pid = map.get(slotOrder);
    const p = pid ? playerById.get(pid) : null;
    const posLabel =
      role === "starter"
        ? (currentFormation.slots.find((s) => s.slotOrder === slotOrder)?.label ?? "")
        : `Sub ${slotOrder}`;

    sheetContent = (
      <div className="px-4 pb-10 pt-1">
        <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
          {posLabel}
        </p>
        <p className="mb-5 text-base font-bold text-zinc-800">
          {p?.display_name ?? "Unknown"}
          {p?.jersey_number != null ? ` (#${p.jersey_number})` : ""}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSheet({ mode: "place", role, slotOrder })}
            className="rounded-lg border border-zinc-200 px-4 py-3.5 text-left text-sm font-medium text-zinc-800 hover:border-[#00267F] hover:text-[#00267F]"
          >
            Change player
          </button>
          <button
            type="button"
            onClick={() => {
              removeFromSlot(role, slotOrder);
              closeSheet();
            }}
            className="rounded-lg border border-zinc-200 px-4 py-3.5 text-left text-sm font-medium text-red-600 hover:border-red-300"
          >
            Remove from lineup
          </button>
        </div>
      </div>
    );
  } else if (sheet.mode === "place") {
    const { role, slotOrder } = sheet;
    const currentPid = (role === "starter" ? starters : subs).get(slotOrder);
    const posLabel =
      role === "starter"
        ? (currentFormation.slots.find((s) => s.slotOrder === slotOrder)?.label ?? "")
        : `Sub ${slotOrder}`;

    sheetContent = (
      <div>
        <div className="px-4 pb-2 pt-1">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            {posLabel}
          </p>
          <p className="text-sm text-zinc-500">Tap a player to assign</p>
        </div>
        <ul className="divide-y divide-zinc-100 pb-8">
          {sortedPlayers.map((p) => {
            const assigned = assignedIds.has(p.id);
            const isCurrent = currentPid === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    assignPlayer(role, slotOrder, p.id);
                    closeSheet();
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 ${isCurrent ? "bg-blue-50" : ""}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrent
                        ? "bg-[#00267F] text-white"
                        : assigned
                          ? "bg-zinc-200 text-zinc-500"
                          : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {p.jersey_number ?? "—"}
                  </span>
                  <span className="flex-1 text-sm font-medium text-zinc-800">
                    {p.display_name}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase text-[#00267F]">
                      Here
                    </span>
                  )}
                  {assigned && !isCurrent && (
                    <span className="text-[10px] font-bold uppercase text-zinc-400">
                      Placed
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Formation picker */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Formation
        </p>
        <div className="flex flex-wrap gap-2">
          {formations.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFormationChange(f.id as FormationId)}
              className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
                formation === f.id
                  ? "border-[#00267F] bg-[#00267F] text-white"
                  : "border-zinc-300 text-zinc-700 hover:border-[#00267F] hover:text-[#00267F]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Changing formation clears all assigned players.
        </p>
      </div>

      {/* Pitch + bench */}
      <div>
        {/* Pitch SVG */}
        <div className="mx-auto w-full max-w-[340px]">
          <svg
            viewBox="0 0 300 450"
            className="w-full rounded-xl shadow-md"
            aria-label="Football pitch — tap a slot to assign a player"
          >
            {/* Background */}
            <rect width="300" height="450" fill="#2D7A3A" rx="8" />

            {/* Field markings */}
            <g
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.5"
              fill="none"
            >
              <rect x="12" y="12" width="276" height="426" />
              <line x1="12" y1="225" x2="288" y2="225" />
              <circle cx="150" cy="225" r="32" />
              {/* Bottom penalty box (GK end) */}
              <rect x="68" y="372" width="164" height="66" />
              <rect x="108" y="418" width="84" height="20" />
              {/* Top penalty box (attack end) */}
              <rect x="68" y="12" width="164" height="66" />
              <rect x="108" y="12" width="84" height="20" />
            </g>
            <circle cx="150" cy="225" r="2.5" fill="rgba(255,255,255,0.5)" />
            <circle cx="150" cy="398" r="2.5" fill="rgba(255,255,255,0.5)" />
            <circle cx="150" cy="52" r="2.5" fill="rgba(255,255,255,0.5)" />

            {/* Starter slots */}
            {currentFormation.slots.map((slot) => {
              const pid = starters.get(slot.slotOrder) ?? null;
              const p = pid ? playerById.get(pid) : undefined;
              const filled = p != null;
              const mainLabel = filled
                ? p.jersey_number != null
                  ? String(p.jersey_number)
                  : "?"
                : slot.label;
              const subLabel = filled ? lastName(p).slice(0, 6) : null;

              return (
                <g
                  key={slot.slotOrder}
                  onClick={() => handleSlotTap("starter", slot.slotOrder)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSlotTap("starter", slot.slotOrder);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${slot.label}: ${p?.display_name ?? "Empty — tap to assign"}`}
                  className="cursor-pointer outline-none"
                >
                  {/* Invisible larger hit target */}
                  <circle cx={slot.x} cy={slot.y} r={26} fill="transparent" />
                  <circle
                    cx={slot.x}
                    cy={slot.y}
                    r={19}
                    fill={filled ? "#00267F" : "rgba(255,255,255,0.18)"}
                    stroke={filled ? "white" : "rgba(255,255,255,0.65)"}
                    strokeWidth={filled ? 2 : 1.5}
                    strokeDasharray={filled ? undefined : "4 3"}
                  />
                  <text
                    x={slot.x}
                    y={subLabel ? slot.y - 4 : slot.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={filled ? 11 : 8}
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                  >
                    {mainLabel}
                  </text>
                  {subLabel && (
                    <text
                      x={slot.x}
                      y={slot.y + 6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.85)"
                      fontSize={6.5}
                      fontFamily="system-ui, sans-serif"
                    >
                      {subLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bench */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Bench
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {Array.from({ length: SUB_SLOTS }, (_, i) => i + 1).map((slotOrder) => {
              const pid = subs.get(slotOrder) ?? null;
              const p = pid ? playerById.get(pid) : undefined;
              const filled = p != null;
              return (
                <button
                  key={slotOrder}
                  type="button"
                  onClick={() => handleSlotTap("sub", slotOrder)}
                  className={`flex h-[56px] w-[56px] shrink-0 flex-col items-center justify-center rounded-full border-2 transition-colors ${
                    filled
                      ? "border-[#00267F] bg-[#00267F] text-white"
                      : "border-dashed border-zinc-300 bg-white text-zinc-400 hover:border-zinc-400"
                  }`}
                  aria-label={
                    filled
                      ? `Sub ${slotOrder}: ${p.display_name}`
                      : `Sub ${slotOrder}: Empty`
                  }
                >
                  {filled ? (
                    <>
                      <span className="text-xs font-bold leading-none">
                        {p.jersey_number != null ? `#${p.jersey_number}` : "?"}
                      </span>
                      <span className="mt-0.5 w-full truncate px-1 text-center text-[8px] leading-none">
                        {lastName(p).slice(0, 6)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold">S{slotOrder}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded bg-[#00267F] border-t border-t-[#3349A3] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Lineup"}
        </button>
        {flashSaved && (
          <span className="text-sm font-medium text-green-600">Saved ✓</span>
        )}
        {errorMsg && <span className="text-sm text-red-600">{errorMsg}</span>}
      </div>

      {/* Bottom sheet */}
      {sheet.mode !== "closed" && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={closeSheet}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[72vh] overflow-y-auto rounded-t-2xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            {/* Handle */}
            <div className="sticky top-0 flex justify-center bg-white pb-2 pt-3">
              <div className="h-1 w-10 rounded-full bg-zinc-200" />
            </div>
            {sheetContent}
          </div>
        </>
      )}
    </div>
  );
}
