"use client";

import { useState, useTransition } from "react";
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

const SUB_SLOTS = 7;

export default function LineupBuilder({
  fixtureId,
  players,
  formations,
  savedFormation,
  savedPlayers,
}: Props) {
  const [formation, setFormation] = useState<FormationId>(
    (savedFormation as FormationId | null) ?? (formations[0].id as FormationId) ?? DEFAULT_FORMATION,
  );

  const initStarters = (): Map<number, string> => {
    const m = new Map<number, string>();
    for (const p of savedPlayers) {
      if (p.role === "starter") m.set(p.slot_order, p.player_id);
    }
    return m;
  };

  const initSubs = (): Map<number, string> => {
    const m = new Map<number, string>();
    for (const p of savedPlayers) {
      if (p.role === "sub") m.set(p.slot_order, p.player_id);
    }
    return m;
  };

  const [starters, setStarters] = useState<Map<number, string>>(initStarters);
  const [subs, setSubs] = useState<Map<number, string>>(initSubs);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flashSaved, setFlashSaved] = useState(false);

  const currentFormation =
    formations.find((f) => f.id === formation) ?? formations[0];

  const assignedIds = new Set([...starters.values(), ...subs.values()]);

  const handleFormationChange = (id: FormationId) => {
    setFormation(id);
    setStarters(new Map());
    setSubs(new Map());
  };

  const setStarterSlot = (slotOrder: number, playerId: string) => {
    setStarters((prev) => {
      const next = new Map(prev);
      if (playerId === "") {
        next.delete(slotOrder);
      } else {
        // Remove player from any other slot first
        for (const [k, v] of next) {
          if (v === playerId && k !== slotOrder) next.delete(k);
        }
        // Also remove from subs
        setSubs((prevSubs) => {
          const s = new Map(prevSubs);
          for (const [k, v] of s) {
            if (v === playerId) s.delete(k);
          }
          return s;
        });
        next.set(slotOrder, playerId);
      }
      return next;
    });
  };

  const setSubSlot = (slotOrder: number, playerId: string) => {
    setSubs((prev) => {
      const next = new Map(prev);
      if (playerId === "") {
        next.delete(slotOrder);
      } else {
        // Remove player from any other sub slot
        for (const [k, v] of next) {
          if (v === playerId && k !== slotOrder) next.delete(k);
        }
        // Remove from starters
        setStarters((prevStarters) => {
          const s = new Map(prevStarters);
          for (const [k, v] of s) {
            if (v === playerId) s.delete(k);
          }
          return s;
        });
        next.set(slotOrder, playerId);
      }
      return next;
    });
  };

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

      const result = await saveLineup({
        fixtureId,
        formation,
        players: slotPlayers,
      });

      if ("error" in result) {
        setErrorMsg(result.error);
      } else {
        setFlashSaved(true);
        setTimeout(() => setFlashSaved(false), 2000);
      }
    });
  };

  const playerLabel = (p: Player) => {
    const num = p.jersey_number != null ? `#${p.jersey_number} ` : "";
    return `${num}${p.display_name}`;
  };

  return (
    <div className="space-y-8">
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

      {/* Starters */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Starting XI
        </p>
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {currentFormation.slots.map((slot) => {
            const value = starters.get(slot.slotOrder) ?? "";
            return (
              <div
                key={slot.slotOrder}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-10 shrink-0 text-xs font-bold uppercase tracking-wide text-zinc-400">
                  {slot.label}
                </span>
                <select
                  value={value}
                  onChange={(e) =>
                    setStarterSlot(slot.slotOrder, e.target.value)
                  }
                  className="flex-1 rounded border border-zinc-200 bg-transparent py-1 pl-2 pr-6 text-sm text-zinc-800 focus:border-[#00267F] focus:outline-none focus:ring-1 focus:ring-[#00267F]"
                  aria-label={`${slot.label} slot player`}
                >
                  <option value="">— Empty —</option>
                  {players.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={assignedIds.has(p.id) && value !== p.id}
                    >
                      {playerLabel(p)}
                      {assignedIds.has(p.id) && value !== p.id ? " ✓" : ""}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bench */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Bench
        </p>
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {Array.from({ length: SUB_SLOTS }, (_, i) => i + 1).map(
            (slotOrder) => {
              const value = subs.get(slotOrder) ?? "";
              return (
                <div
                  key={slotOrder}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="w-10 shrink-0 text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Sub {slotOrder}
                  </span>
                  <select
                    value={value}
                    onChange={(e) => setSubSlot(slotOrder, e.target.value)}
                    className="flex-1 rounded border border-zinc-200 bg-transparent py-1 pl-2 pr-6 text-sm text-zinc-800 focus:border-[#00267F] focus:outline-none focus:ring-1 focus:ring-[#00267F]"
                    aria-label={`Substitute ${slotOrder} player`}
                  >
                    <option value="">— Empty —</option>
                    {players.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={assignedIds.has(p.id) && value !== p.id}
                      >
                        {playerLabel(p)}
                        {assignedIds.has(p.id) && value !== p.id ? " ✓" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              );
            },
          )}
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
        {errorMsg && (
          <span className="text-sm text-red-600">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}
