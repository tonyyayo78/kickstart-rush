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

type Card = {
  player_id: string;
  card_type: string;
};

type CardDisplay = "yellow" | "red" | "second_yellow";

type Props = {
  fixtureId: string;
  players: Player[];
  formations: Formation[];
  savedFormation: string | null;
  savedPlayers: SavedPlayer[];
  fixtureCards?: Card[];
};

function cardDisplay(cards: Card[]): CardDisplay | null {
  if (cards.some((c) => c.card_type === "red")) return "red";
  if (cards.some((c) => c.card_type === "second_yellow")) return "second_yellow";
  if (cards.some((c) => c.card_type === "yellow")) return "yellow";
  return null;
}

type SheetState =
  | { mode: "closed" }
  | { mode: "place"; role: "starter" | "sub"; slotOrder: number }
  | { mode: "action"; role: "starter" | "sub"; slotOrder: number };

const SUB_SLOTS = 7;

// display_name is generated as "A. Smith" — extract after ". "
function lastName(p: Player): string {
  return p.display_name.split(". ")[1] ?? p.display_name;
}

// SVG animation / interaction styles — scoped with lbp- prefix to avoid
// colliding with any global CSS that might share the same class names.
const SVG_STYLES = `
  .lbp-chip-enter {
    animation: lbp-chip-enter 150ms ease-out both;
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes lbp-chip-enter {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1);    }
  }
  .lbp-slot-btn {
    transition: transform 80ms ease-out;
    transform-box: fill-box;
    transform-origin: center;
  }
  .lbp-slot-btn:active { transform: scale(0.95); }
`;

export default function LineupBuilder({
  fixtureId,
  players,
  formations,
  savedFormation,
  savedPlayers,
  fixtureCards = [],
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
  // sheetVisible keeps the DOM node alive during the slide-out transition.
  // sheetIn drives the CSS translate — toggled in event handlers, not effects.
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetIn, setSheetIn] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flashSaved, setFlashSaved] = useState(false);

  const currentFormation = formations.find((f) => f.id === formation) ?? formations[0];
  const playerById = new Map(players.map((p) => [p.id, p]));
  const assignedIds = new Set([...starters.values(), ...subs.values()]);

  // Group cards by player_id for O(1) chip lookup
  const cardsByPlayer = new Map<string, Card[]>();
  for (const c of fixtureCards) {
    const existing = cardsByPlayer.get(c.player_id) ?? [];
    cardsByPlayer.set(c.player_id, [...existing, c]);
  }

  // Scroll lock while sheet is open
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

  // Open / close the bottom sheet with slide animation.
  // All setState is in event handlers (not effects) to satisfy react-hooks/set-state-in-effect.
  const openSheet = (next: Exclude<SheetState, { mode: "closed" }>) => {
    setSheet(next);
    setSheetVisible(true);
    // One rAF so the browser paints translate-y-full before transitioning to 0
    requestAnimationFrame(() => setSheetIn(true));
  };

  const closeSheet = () => {
    setSheetIn(false);
    // Keep the DOM node until the slide-out transition finishes
    setTimeout(() => {
      setSheetVisible(false);
      setSheet({ mode: "closed" });
    }, 210);
  };

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
    openSheet(
      map.has(slotOrder)
        ? { mode: "action", role, slotOrder }
        : { mode: "place", role, slotOrder },
    );
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
            onClick={() => openSheet({ mode: "place", role, slotOrder })}
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
        <div className="mx-auto w-full max-w-[340px] drop-shadow-2xl">
          <svg
            viewBox="0 0 300 450"
            className="w-full rounded-xl"
            aria-label="Football pitch — tap a slot to assign a player"
          >
            <defs>
              {/* Pitch vertical gradient: deeper green at attack end */}
              <linearGradient id="pitch-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#1F6B2E" />
                <stop offset="100%" stopColor="#338C44" />
              </linearGradient>

              {/* Mowed grass stripes: 9 × 50px bands, alternating transparent/6% white */}
              <pattern
                id="grass-stripes"
                x="0" y="0"
                width="300" height="50"
                patternUnits="userSpaceOnUse"
              >
                <rect x="0" y="0"  width="300" height="25" fill="transparent" />
                <rect x="0" y="25" width="300" height="25" fill="rgba(255,255,255,0.06)" />
              </pattern>

              {/* Inner vignette: transparent centre → 18% black at corners */}
              <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
                <stop offset="0%"   stopColor="black" stopOpacity="0"    />
                <stop offset="100%" stopColor="black" stopOpacity="0.18" />
              </radialGradient>

              {/* Field markings white glow: blur copy merged under sharp original */}
              <filter id="line-glow" x="-8%" y="-8%" width="116%" height="116%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Chip radial gradient: lit-from-top-left → deep Barbados blue */}
              <radialGradient id="chip-fill" cx="38%" cy="30%" r="65%">
                <stop offset="0%"   stopColor="#4A6ECC" />
                <stop offset="55%"  stopColor="#00267F" />
                <stop offset="100%" stopColor="#001650" />
              </radialGradient>

              {/* Filled chip drop shadow */}
              <filter id="chip-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow
                  dx="0" dy="2.5" stdDeviation="3.5"
                  floodColor="#000000" floodOpacity="0.35"
                />
              </filter>

              {/* Empty slot lighter shadow */}
              <filter id="slot-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow
                  dx="0" dy="1.5" stdDeviation="2"
                  floodColor="#000000" floodOpacity="0.2"
                />
              </filter>

              {/* Sent-off chip: reduce saturation to ~45% */}
              <filter id="chip-sent-off" x="-30%" y="-30%" width="160%" height="160%">
                <feColorMatrix type="saturate" values="0.45" />
              </filter>

              {/* CSS animations scoped with lbp- prefix */}
              <style>{SVG_STYLES}</style>
            </defs>

            {/* ── Pitch layers ── */}
            {/* 1. Base gradient */}
            <rect width="300" height="450" fill="url(#pitch-grad)" rx="8" />
            {/* 2. Grass stripes */}
            <rect width="300" height="450" fill="url(#grass-stripes)" rx="8" />
            {/* 3. Vignette */}
            <rect width="300" height="450" fill="url(#vignette)" rx="8" />

            {/* ── Field markings ── */}
            <g
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.5"
              fill="none"
              filter="url(#line-glow)"
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
            <circle cx="150" cy="225" r="2.5" fill="rgba(255,255,255,0.85)" />
            <circle cx="150" cy="398" r="2.5" fill="rgba(255,255,255,0.85)" />
            <circle cx="150" cy="52"  r="2.5" fill="rgba(255,255,255,0.85)" />

            {/* ── Starter slots ── */}
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

              const chipCards = pid ? (cardsByPlayer.get(pid) ?? []) : [];
              const card = filled ? cardDisplay(chipCards) : null;
              const sentOff = card === "red" || card === "second_yellow";

              return (
                // Key includes pid so a new assignment remounts the chip,
                // re-triggering the chip-enter animation.
                <g
                  key={filled ? `${slot.slotOrder}-${pid}` : `${slot.slotOrder}`}
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
                  className={`cursor-pointer outline-none lbp-slot-btn ${filled ? "lbp-chip-enter" : ""}`}
                  filter={sentOff ? "url(#chip-sent-off)" : undefined}
                >
                  {/* Invisible enlarged hit target */}
                  <circle cx={slot.x} cy={slot.y} r={26} fill="transparent" />

                  {/* Chip circle */}
                  <circle
                    cx={slot.x}
                    cy={slot.y}
                    r={19}
                    fill={filled ? "url(#chip-fill)" : "rgba(255,255,255,0.18)"}
                    stroke="white"
                    strokeWidth={filled ? 2.5 : 1.5}
                    strokeDasharray={filled ? undefined : "4 3"}
                    filter={filled ? "url(#chip-shadow)" : "url(#slot-shadow)"}
                  />

                  {/* Glossy inner highlight arc (filled chips only) */}
                  {filled && (
                    <ellipse
                      cx={slot.x}
                      cy={slot.y - 10}
                      rx={9}
                      ry={4.5}
                      fill="rgba(255,255,255,0.22)"
                    />
                  )}

                  {/* Primary label */}
                  <text
                    x={slot.x}
                    y={subLabel ? slot.y - 3 : slot.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={filled ? 11 : 8}
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                  >
                    {mainLabel}
                  </text>

                  {/* Sub-label: surname truncated */}
                  {subLabel && (
                    <text
                      x={slot.x}
                      y={slot.y + 7}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.85)"
                      fontSize={6.5}
                      fontFamily="system-ui, sans-serif"
                    >
                      {subLabel}
                    </text>
                  )}

                  {/* Card indicator — top-right of chip */}
                  {card === "yellow" && (
                    <rect
                      x={slot.x + 12} y={slot.y - 24}
                      width={6} height={9} rx={0.5}
                      fill="#FACC15" stroke="#854D0E" strokeWidth={0.5}
                    />
                  )}
                  {card === "red" && (
                    <rect
                      x={slot.x + 12} y={slot.y - 24}
                      width={6} height={9} rx={0.5}
                      fill="#DC2626" stroke="#7F1D1D" strokeWidth={0.5}
                    />
                  )}
                  {card === "second_yellow" && (
                    <>
                      <rect
                        x={slot.x + 14} y={slot.y - 22}
                        width={6} height={9} rx={0.5}
                        fill="#DC2626" stroke="#7F1D1D" strokeWidth={0.5}
                      />
                      <rect
                        x={slot.x + 11} y={slot.y - 25}
                        width={6} height={9} rx={0.5}
                        fill="#FACC15" stroke="#854D0E" strokeWidth={0.5}
                      />
                    </>
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

              const chipCards = pid ? (cardsByPlayer.get(pid) ?? []) : [];
              const card = filled ? cardDisplay(chipCards) : null;
              const sentOff = card === "red" || card === "second_yellow";

              return (
                <button
                  key={filled ? `sub-${slotOrder}-${pid}` : `sub-${slotOrder}`}
                  type="button"
                  onClick={() => handleSlotTap("sub", slotOrder)}
                  style={sentOff ? { filter: "saturate(0.45)" } : undefined}
                  className={`relative flex h-[56px] w-[56px] shrink-0 flex-col items-center justify-center rounded-full border-2 transition-all active:scale-95 ${
                    filled
                      ? "border-[#001650] bg-gradient-to-br from-[#4A6ECC] via-[#00267F] to-[#001650] text-white shadow-lg shadow-black/30"
                      : "border-dashed border-zinc-300 bg-white text-zinc-400 shadow-md shadow-black/10 hover:border-zinc-400"
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

                  {/* Card indicator — top-right of chip */}
                  {card === "yellow" && (
                    <span
                      className="pointer-events-none absolute -right-1 -top-1 h-[9px] w-[6px] rounded-[1px]"
                      style={{ background: "#FACC15", border: "0.5px solid #854D0E" }}
                      aria-hidden="true"
                    />
                  )}
                  {card === "red" && (
                    <span
                      className="pointer-events-none absolute -right-1 -top-1 h-[9px] w-[6px] rounded-[1px]"
                      style={{ background: "#DC2626", border: "0.5px solid #7F1D1D" }}
                      aria-hidden="true"
                    />
                  )}
                  {card === "second_yellow" && (
                    <>
                      <span
                        className="pointer-events-none absolute -right-0.5 -top-0.5 h-[9px] w-[6px] rounded-[1px]"
                        style={{ background: "#DC2626", border: "0.5px solid #7F1D1D" }}
                        aria-hidden="true"
                      />
                      <span
                        className="pointer-events-none absolute -right-1.5 -top-1.5 h-[9px] w-[6px] rounded-[1px]"
                        style={{ background: "#FACC15", border: "0.5px solid #854D0E" }}
                        aria-hidden="true"
                      />
                    </>
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

      {/* Bottom sheet — animated slide-up */}
      {sheetVisible && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${sheetIn ? "opacity-100" : "opacity-0"}`}
            onClick={closeSheet}
            aria-hidden="true"
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[72vh] overflow-y-auto rounded-t-2xl bg-white shadow-xl transition-transform duration-200 ease-out ${sheetIn ? "translate-y-0" : "translate-y-full"}`}
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
