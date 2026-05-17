"use client";
import { useEffect, useRef, useState, useTransition } from "react";
// useRef is used for the player picker outside-click handler
import { useRouter } from "next/navigation";
import {
  kickOff,
  setStoppage,
  endFirstHalf,
  startSecondHalf,
  endMatch,
  reopenMatch,
  logGoal,
  deleteGoal,
  updateGoal,
} from "./actions";

// ── Types ─────────────────────────────────────────────────────

export type MatchState =
  | "not_started"
  | "h1"
  | "h1_stoppage"
  | "halftime"
  | "h2"
  | "h2_stoppage"
  | "full_time";

export type GoalRow = {
  id: string;
  half: number;
  minute: number | null;
  stoppage_minutes: number;
  scoring_team: "kickstart" | "opposition" | null;
  player_id: string | null;
  player_name: string | null;
  competition_team_id: string;
};

export type PlayerOption = {
  id: string;
  jersey_number: number | null;
  first_name: string;
  last_name: string;
};

export type Props = {
  fixtureId: string;
  homeTeamName: string;
  awayTeamName: string;
  kickstartTeamId: string;
  oppositionTeamId: string;
  kickstartIsHome: boolean;
  matchState: MatchState | null;
  h1StartedAt: string | null;
  h2StartedAt: string | null;
  h1StoppageMinutes: number;
  h2StoppageMinutes: number;
  players: PlayerOption[];
  goals: GoalRow[];
};

// ── Clock logic ───────────────────────────────────────────────

const H1_END = 35;
const H2_START = 36;
const H2_END = 70;

type ClockInfo = {
  display: string;
  halfLabel: string;
  half: 1 | 2;
  minute: number;
  stoppageMinutes: number;
  isLive: boolean;
};

function computeClock(
  matchState: MatchState | null,
  h1At: string | null,
  h2At: string | null,
): ClockInfo {
  const now = Date.now();
  if (!matchState || matchState === "not_started") {
    return { display: "", halfLabel: "Before Kick Off", half: 1, minute: 0, stoppageMinutes: 0, isLive: false };
  }
  if (matchState === "halftime") {
    return { display: "HT", halfLabel: "Half Time", half: 1, minute: H1_END, stoppageMinutes: 0, isLive: false };
  }
  if (matchState === "full_time") {
    return { display: "FT", halfLabel: "Full Time", half: 2, minute: H2_END, stoppageMinutes: 0, isLive: false };
  }
  if ((matchState === "h1" || matchState === "h1_stoppage") && h1At) {
    const elapsed = Math.floor((now - new Date(h1At).getTime()) / 60_000);
    const raw = elapsed + 1;
    if (raw <= H1_END) {
      return { display: `${raw}'`, halfLabel: "First Half", half: 1, minute: raw, stoppageMinutes: 0, isLive: true };
    }
    const stop = raw - H1_END;
    return { display: `${H1_END}+${stop}'`, halfLabel: "First Half", half: 1, minute: H1_END, stoppageMinutes: stop, isLive: true };
  }
  if ((matchState === "h2" || matchState === "h2_stoppage") && h2At) {
    const elapsed = Math.floor((now - new Date(h2At).getTime()) / 60_000);
    const raw = H2_START + elapsed;
    if (raw <= H2_END) {
      return { display: `${raw}'`, halfLabel: "Second Half", half: 2, minute: raw, stoppageMinutes: 0, isLive: true };
    }
    const stop = raw - H2_END;
    return { display: `${H2_END}+${stop}'`, halfLabel: "Second Half", half: 2, minute: H2_END, stoppageMinutes: stop, isLive: true };
  }
  return { display: "", halfLabel: "", half: 1, minute: 0, stoppageMinutes: 0, isLive: false };
}

function goalMinuteLabel(g: GoalRow): string {
  if (g.minute === null) return "—";
  return g.stoppage_minutes > 0 ? `${g.minute}+${g.stoppage_minutes}'` : `${g.minute}'`;
}

// ── Shared styles ─────────────────────────────────────────────

const btnPrimary =
  "rounded-md bg-[#00267F] border-t border-t-[#3349A3] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40";
const btnSecondary =
  "rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40";
const inputCls =
  "rounded-md border border-black/10 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]";

// ── Component ─────────────────────────────────────────────────

export default function LiveMatchTracker({
  fixtureId,
  homeTeamName,
  awayTeamName,
  kickstartTeamId,
  oppositionTeamId,
  kickstartIsHome,
  matchState,
  h1StartedAt,
  h2StartedAt,
  h1StoppageMinutes,
  h2StoppageMinutes,
  players,
  goals,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Stoppage picker
  const [showStoppage, setShowStoppage] = useState(false);

  // Player picker overlay
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Reopen confirmation
  const [confirmReopen, setConfirmReopen] = useState(false);

  // Goal edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinute, setEditMinute] = useState("");
  const [editStoppage, setEditStoppage] = useState("");
  const [editPlayerId, setEditPlayerId] = useState("");

  // Tick clock every 15s while live
  useEffect(() => {
    const live = ["h1", "h1_stoppage", "h2", "h2_stoppage"].includes(matchState ?? "");
    if (!live) return;
    const id = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, [matchState]);

  // Re-fetch server state whenever the tab/page becomes visible again.
  // Covers browser bfcache, tab switching, and mobile-app resume —
  // without it, returning to the page can show stale match_state
  // (e.g., a "Kick Off" button after kickoff actually happened).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  // Close player picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  const clock = computeClock(matchState, h1StartedAt, h2StartedAt);
  // tick is read to force re-render each interval
  void tick;

  const currentHalf = clock.half as 1 | 2;
  const currentStoppage =
    currentHalf === 1 ? h1StoppageMinutes : h2StoppageMinutes;

  const isLivePlaying =
    matchState === "h1" ||
    matchState === "h1_stoppage" ||
    matchState === "h2" ||
    matchState === "h2_stoppage";

  const kickstartGoals = goals.filter((g) => g.scoring_team === "kickstart").length;
  const oppositionGoals = goals.filter((g) => g.scoring_team === "opposition").length;
  const kickstartScore = kickstartIsHome ? kickstartGoals : kickstartGoals;
  const oppositionScore = oppositionGoals;
  // Home/away labeling for display
  const homeScore = kickstartIsHome ? kickstartScore : oppositionScore;
  const awayScore = kickstartIsHome ? oppositionScore : kickstartScore;

  function run(fn: () => Promise<{ error?: string } | null>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) { setError(res.error); return; }
      setShowStoppage(false);
      router.refresh();
    });
  }

  function startEdit(g: GoalRow) {
    setEditingId(g.id);
    setEditMinute(g.minute != null ? String(g.minute) : "");
    setEditStoppage(String(g.stoppage_minutes ?? 0));
    setEditPlayerId(g.player_id ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handlePickerSelect(playerId: string) {
    setPickerOpen(false);
    run(() =>
      logGoal(fixtureId, {
        half: clock.half as 1 | 2,
        minute: clock.minute,
        stoppageMinutes: clock.stoppageMinutes,
        scoringTeam: "kickstart",
        kickstartTeamId,
        oppositionTeamId,
        playerId,
      }),
    );
  }

  function handleOppositionGoal() {
    run(() =>
      logGoal(fixtureId, {
        half: clock.half as 1 | 2,
        minute: clock.minute,
        stoppageMinutes: clock.stoppageMinutes,
        scoringTeam: "opposition",
        kickstartTeamId,
        oppositionTeamId,
      }),
    );
  }

  function handleSaveEdit() {
    if (!editingId) return;
    const min = parseInt(editMinute, 10);
    const stop = parseInt(editStoppage, 10) || 0;
    if (isNaN(min) || min < 1) { setError("Enter a valid minute."); return; }
    const goal = goals.find((g) => g.id === editingId);
    if (!goal) return;
    run(async () => {
      const res = await updateGoal(editingId, fixtureId, {
        half: (goal.half as 1 | 2) ?? 1,
        minute: min,
        stoppageMinutes: stop,
        playerId: editPlayerId || undefined,
      });
      if (!res?.error) setEditingId(null);
      return res;
    });
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Score + clock */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {clock.halfLabel}
        </p>
        {clock.display && (
          <p className="mt-1 text-4xl font-black tabular-nums text-[#00267F]">
            {clock.display}
          </p>
        )}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-zinc-500 truncate max-w-[100px]">{homeTeamName}</span>
            <span className="text-5xl font-black tabular-nums">{homeScore}</span>
          </div>
          <span className="text-2xl font-light text-zinc-300 mt-4">—</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-zinc-500 truncate max-w-[100px]">{awayTeamName}</span>
            <span className="text-5xl font-black tabular-nums">{awayScore}</span>
          </div>
        </div>
      </div>

      {/* Clock controls */}
      <div className="flex flex-col gap-3">
        {(!matchState || matchState === "not_started") && (
          <button
            className={btnPrimary}
            disabled={isPending}
            onClick={() => run(() => kickOff(fixtureId))}
          >
            Kick Off — Start First Half
          </button>
        )}

        {(matchState === "h1" || matchState === "h1_stoppage") && (
          <>
            <div className="flex gap-2">
              <button
                className={btnSecondary}
                disabled={isPending}
                onClick={() => setShowStoppage((v) => !v)}
              >
                {matchState === "h1_stoppage"
                  ? `Adjust Stoppage (${currentStoppage}')`
                  : "Add Stoppage Time"}
              </button>
              <button
                className={btnPrimary}
                disabled={isPending}
                onClick={() => run(() => endFirstHalf(fixtureId))}
              >
                End First Half
              </button>
            </div>
            {showStoppage && (
              <StopagePicker
                half={1}
                current={h1StoppageMinutes}
                isPending={isPending}
                onPick={(m) => run(() => setStoppage(fixtureId, 1, m))}
              />
            )}
          </>
        )}

        {matchState === "halftime" && (
          <button
            className={btnPrimary}
            disabled={isPending}
            onClick={() => run(() => startSecondHalf(fixtureId))}
          >
            Start Second Half
          </button>
        )}

        {(matchState === "h2" || matchState === "h2_stoppage") && (
          <>
            <div className="flex gap-2">
              <button
                className={btnSecondary}
                disabled={isPending}
                onClick={() => setShowStoppage((v) => !v)}
              >
                {matchState === "h2_stoppage"
                  ? `Adjust Stoppage (${currentStoppage}')`
                  : "Add Stoppage Time"}
              </button>
              <button
                className={btnPrimary}
                disabled={isPending}
                onClick={() => run(() => endMatch(fixtureId))}
              >
                End Match
              </button>
            </div>
            {showStoppage && (
              <StopagePicker
                half={2}
                current={h2StoppageMinutes}
                isPending={isPending}
                onPick={(m) => run(() => setStoppage(fixtureId, 2, m))}
              />
            )}
          </>
        )}

        {matchState === "full_time" && (
          <>
            {!confirmReopen ? (
              <button
                className={btnSecondary}
                onClick={() => setConfirmReopen(true)}
              >
                Reopen Match
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-sm text-amber-800 flex-1">Reopen and continue Second Half?</p>
                <button
                  className="text-sm font-semibold text-red-600 hover:underline"
                  disabled={isPending}
                  onClick={() => { setConfirmReopen(false); run(() => reopenMatch(fixtureId)); }}
                >
                  Yes, reopen
                </button>
                <button
                  className="text-sm text-zinc-500 hover:underline"
                  onClick={() => setConfirmReopen(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Goal buttons */}
      {isLivePlaying && (
        <div className="relative">
          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-xl border-2 border-[#00267F] bg-[#EEF2FF] px-4 py-5 text-base font-black text-[#00267F] transition-all hover:bg-[#dde5ff] active:scale-95 disabled:opacity-40"
              disabled={isPending}
              onClick={() => setPickerOpen(true)}
            >
              + Kickstart Goal
            </button>
            <button
              className="rounded-xl border-2 border-zinc-300 bg-zinc-50 px-4 py-5 text-base font-black text-zinc-700 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-40"
              disabled={isPending}
              onClick={handleOppositionGoal}
            >
              + Opposition Goal
            </button>
          </div>
          <p className="mt-1 text-center text-xs text-zinc-400">{clock.display}</p>

          {/* Player picker overlay */}
          {pickerOpen && (
            <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" />
          )}
          {pickerOpen && (
            <div
              ref={pickerRef}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3">
                <h2 className="font-bold text-sm uppercase tracking-wide">Select scorer — {clock.display}</h2>
                <button
                  className="text-zinc-400 hover:text-zinc-700 text-xl leading-none"
                  onClick={() => setPickerOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <ul className="divide-y divide-zinc-100">
                {players.map((p) => (
                  <li key={p.id}>
                    <button
                      className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                      onClick={() => handlePickerSelect(p.id)}
                    >
                      <span className="mr-3 inline-block w-7 text-right font-mono text-zinc-400 text-xs">
                        {p.jersey_number ?? "—"}
                      </span>
                      {p.first_name} {p.last_name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Goals list */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Goals
        </h2>
        {goals.length === 0 ? (
          <p className="text-sm text-zinc-400">No goals yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {[...goals].reverse().map((g) => (
              <li key={g.id} className="rounded-lg border border-zinc-100 bg-white">
                {editingId === g.id ? (
                  // Inline edit form
                  <div className="flex flex-wrap items-end gap-2 p-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-500">Minute</label>
                      <input
                        type="number" min={1} max={130}
                        value={editMinute}
                        onChange={(e) => setEditMinute(e.target.value)}
                        className={`${inputCls} w-20`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-500">Stoppage</label>
                      <input
                        type="number" min={0} max={20}
                        value={editStoppage}
                        onChange={(e) => setEditStoppage(e.target.value)}
                        className={`${inputCls} w-20`}
                      />
                    </div>
                    {g.scoring_team === "kickstart" && (
                      <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                        <label className="text-xs text-zinc-500">Scorer</label>
                        <select
                          value={editPlayerId}
                          onChange={(e) => setEditPlayerId(e.target.value)}
                          className={inputCls}
                        >
                          <option value="">Unknown</option>
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.jersey_number ? `#${p.jersey_number} ` : ""}
                              {p.first_name} {p.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      className={btnPrimary}
                      disabled={isPending}
                      onClick={handleSaveEdit}
                    >
                      Save
                    </button>
                    <button className={btnSecondary} onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="w-14 shrink-0 font-mono text-sm font-semibold text-zinc-700">
                      {goalMinuteLabel(g)}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                        g.scoring_team === "kickstart"
                          ? "bg-[#EEF2FF] text-[#00267F]"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {g.scoring_team === "kickstart" ? "Kickstart" : "Opposition"}
                    </span>
                    <span className="flex-1 text-sm text-zinc-700">
                      {g.player_name ?? (g.scoring_team === "opposition" ? "Opposition" : "Unknown")}
                    </span>
                    <button
                      className="text-xs text-zinc-400 hover:text-[#00267F] transition-colors"
                      onClick={() => startEdit(g)}
                    >
                      Edit
                    </button>
                    <DeleteGoalButton
                      isPending={isPending}
                      onConfirm={() => run(() => deleteGoal(g.id, fixtureId))}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StopagePicker({
  half,
  current,
  isPending,
  onPick,
}: {
  half: 1 | 2;
  current: number;
  isPending: boolean;
  onPick: (m: number) => void;
}) {
  const end = half === 1 ? H1_END : H2_END;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <span className="text-xs font-medium text-zinc-500">
        Stoppage after {end}&apos; — set to:
      </span>
      {[1, 2, 3, 4, 5].map((m) => (
        <button
          key={m}
          disabled={isPending}
          onClick={() => onPick(m)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            current === m
              ? "bg-[#00267F] text-white"
              : "border border-black/10 bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          +{m}&apos;
        </button>
      ))}
      {current > 0 && (
        <button
          disabled={isPending}
          onClick={() => onPick(0)}
          className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function DeleteGoalButton({
  isPending,
  onConfirm,
}: {
  isPending: boolean;
  onConfirm: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button
        className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
        onClick={() => setConfirm(true)}
      >
        Delete
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <button
        className="text-xs font-semibold text-red-600 hover:underline"
        disabled={isPending}
        onClick={() => { setConfirm(false); onConfirm(); }}
      >
        Confirm
      </button>
      <button
        className="text-xs text-zinc-400 hover:underline"
        onClick={() => setConfirm(false)}
      >
        No
      </button>
    </span>
  );
}
