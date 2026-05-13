"use client";
import { useOptimistic, useTransition, useState, useEffect } from "react";

export type FeeStatus = "paid" | "exception" | null;

export type PlayerWithFee = {
  id: string;
  display_name: string;
  jersey_number: number | null;
  feeStatus: FeeStatus;
  note: string | null;
};

type Props = {
  fixtureId: string;
  fixtureLine: string;
  kickstartTeamName: string;
  players: PlayerWithFee[];
  isPlayed?: boolean;
  togglePaidAction: (fixtureId: string, playerId: string) => Promise<void>;
  toggleExceptionAction: (
    fixtureId: string,
    playerId: string,
    note: string,
  ) => Promise<void>;
  updateNoteAction: (
    fixtureId: string,
    playerId: string,
    note: string,
  ) => Promise<void>;
};

type OptimisticPatch = {
  playerId: string;
  newStatus: FeeStatus;
  note: string | null;
};

export default function FeesPanel({
  fixtureId,
  fixtureLine,
  kickstartTeamName,
  players,
  isPlayed = true,
  togglePaidAction,
  toggleExceptionAction,
  updateNoteAction,
}: Props) {
  const [optimisticPlayers, applyOptimistic] = useOptimistic(
    players,
    (state: PlayerWithFee[], patch: OptimisticPatch) =>
      state.map((p) =>
        p.id === patch.playerId
          ? { ...p, feeStatus: patch.newStatus, note: patch.note }
          : p,
      ),
  );

  // Set of player IDs currently awaiting a server action
  const [pending, setPending] = useState<Set<string>>(new Set());

  // Toast error state
  const [toastError, setToastError] = useState<string | null>(null);
  useEffect(() => {
    if (!toastError) return;
    const t = setTimeout(() => setToastError(null), 3000);
    return () => clearTimeout(t);
  }, [toastError]);

  // Inline exception note input: which player is being edited, and the note draft
  const [excEdit, setExcEdit] = useState<{ playerId: string; draft: string } | null>(null);

  const [, startTransition] = useTransition();

  function addPending(id: string) {
    setPending((s) => new Set(s).add(id));
  }
  function removePending(id: string) {
    setPending((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }

  async function handleTogglePaid(player: PlayerWithFee) {
    if (pending.has(player.id)) return;
    // Close any open EXC editor for this player
    if (excEdit?.playerId === player.id) setExcEdit(null);

    const prevStatus = player.feeStatus;
    const newStatus: FeeStatus =
      prevStatus === "paid" ? null : "paid";

    addPending(player.id);
    startTransition(() => {
      applyOptimistic({ playerId: player.id, newStatus, note: null });
    });

    try {
      await togglePaidAction(fixtureId, player.id);
    } catch {
      startTransition(() => {
        applyOptimistic({ playerId: player.id, newStatus: prevStatus, note: player.note });
      });
      setToastError("Couldn't save — tap again to retry.");
    } finally {
      removePending(player.id);
    }
  }

  async function handleToggleException(player: PlayerWithFee) {
    if (pending.has(player.id)) return;

    if (player.feeStatus === "exception") {
      // Toggle off — DELETE immediately, no note needed
      const prevStatus = player.feeStatus;
      const prevNote = player.note;
      if (excEdit?.playerId === player.id) setExcEdit(null);

      addPending(player.id);
      startTransition(() => {
        applyOptimistic({ playerId: player.id, newStatus: null, note: null });
      });

      try {
        await toggleExceptionAction(fixtureId, player.id, "");
      } catch {
        startTransition(() => {
          applyOptimistic({ playerId: player.id, newStatus: prevStatus, note: prevNote });
        });
        setToastError("Couldn't save — tap again to retry.");
      } finally {
        removePending(player.id);
      }
    } else {
      // Toggle on — open inline note input
      setExcEdit({ playerId: player.id, draft: player.note ?? "" });
    }
  }

  async function handleSaveException(player: PlayerWithFee, note: string) {
    if (pending.has(player.id)) return;
    setExcEdit(null);

    const prevStatus = player.feeStatus;
    const prevNote = player.note;

    addPending(player.id);
    startTransition(() => {
      applyOptimistic({ playerId: player.id, newStatus: "exception", note: note.trim() || null });
    });

    try {
      if (prevStatus === "exception") {
        await updateNoteAction(fixtureId, player.id, note);
      } else {
        await toggleExceptionAction(fixtureId, player.id, note);
      }
    } catch {
      startTransition(() => {
        applyOptimistic({ playerId: player.id, newStatus: prevStatus, note: prevNote });
      });
      setToastError("Couldn't save — tap again to retry.");
    } finally {
      removePending(player.id);
    }
  }

  const paidCount = optimisticPlayers.filter((p) => p.feeStatus === "paid").length;
  const excCount = optimisticPlayers.filter((p) => p.feeStatus === "exception").length;
  const notSelCount = optimisticPlayers.filter((p) => p.feeStatus === null).length;
  const collectedCents = optimisticPlayers
    .filter((p) => p.feeStatus === "paid")
    .length * 500;
  const collectedDollars = (collectedCents / 100).toFixed(2);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header + summary */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200">
        <div className="px-3 py-3">
          <p className="text-xs text-zinc-500 leading-tight">{fixtureLine}</p>
          <h1 className="text-lg font-black uppercase tracking-tight leading-tight">
            {kickstartTeamName} — Match Fees
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Record who paid match fees</p>
        </div>
        {isPlayed && (
          <div className="flex items-center justify-between bg-[#00267F] px-3 py-2 text-white">
            <span className="text-lg font-black">${collectedDollars} collected</span>
            <span className="text-xs text-[#B8C5E8]">
              {paidCount} paid · {excCount} exc · {notSelCount} not sel
            </span>
          </div>
        )}
      </div>

      {/* Not-yet-played notice */}
      {!isPlayed && (
        <div className="mx-3 mt-3 mb-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
          Match not yet played — fees can be recorded after kickoff.
        </div>
      )}

      {/* Player list */}
      <ul className="flex flex-col divide-y divide-zinc-100 flex-1">
        {optimisticPlayers.map((player) => {
          const isPaid = player.feeStatus === "paid";
          const isExc = player.feeStatus === "exception";
          const isPending = pending.has(player.id);
          const isExcEditing = excEdit?.playerId === player.id;

          let rowBg = "bg-white";
          if (isPlayed && isPaid) rowBg = "bg-green-50";
          else if (isPlayed && isExc) rowBg = "bg-amber-50";

          return (
            <li key={player.id} className={`${rowBg} transition-colors`}>
              <div className="flex min-h-[64px] items-center gap-3 px-3 py-3">
                {/* Jersey number */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-sm font-black ${isPlayed ? "text-zinc-600" : "text-zinc-400"}`}>
                  {player.jersey_number != null ? `#${player.jersey_number}` : "—"}
                </div>

                {/* Name + note */}
                <div className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${isPlayed ? "" : "text-zinc-400"}`}>
                    {player.display_name}
                  </span>
                  {isPlayed && isExc && player.note && !isExcEditing && (
                    <button
                      type="button"
                      onClick={() =>
                        setExcEdit({ playerId: player.id, draft: player.note ?? "" })
                      }
                      className="mt-0.5 block text-left text-xs text-amber-700 underline underline-offset-2"
                    >
                      {player.note}
                    </button>
                  )}
                  {isPlayed && isExc && !player.note && !isExcEditing && (
                    <button
                      type="button"
                      onClick={() =>
                        setExcEdit({ playerId: player.id, draft: "" })
                      }
                      className="mt-0.5 block text-left text-xs text-zinc-400 underline underline-offset-2"
                    >
                      add note
                    </button>
                  )}
                </div>

                {/* Action buttons — only when the match has been played */}
                {isPlayed && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePaid(player)}
                      disabled={isPending}
                      aria-label={`Mark ${player.display_name} paid`}
                      className={`flex min-h-[44px] min-w-[56px] items-center justify-center rounded text-xs font-bold uppercase tracking-wide transition-colors
                        ${isPending ? "cursor-not-allowed opacity-50" : ""}
                        ${isPaid
                          ? "bg-green-600 text-white"
                          : "bg-zinc-100 text-zinc-400"
                        }`}
                    >
                      PAID
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleException(player)}
                      disabled={isPending}
                      aria-label={`Mark ${player.display_name} exception`}
                      className={`flex min-h-[44px] min-w-[48px] items-center justify-center rounded text-xs font-bold uppercase tracking-wide transition-colors
                        ${isPending ? "cursor-not-allowed opacity-50" : ""}
                        ${isExc
                          ? "bg-amber-500 text-white"
                          : "bg-zinc-100 text-zinc-400"
                        }`}
                    >
                      EXC
                    </button>
                  </div>
                )}
              </div>

              {/* Inline exception note editor */}
              {isPlayed && isExcEditing && (
                <div className="flex items-center gap-2 px-3 pb-3">
                  <input
                    type="text"
                    value={excEdit.draft}
                    onChange={(e) =>
                      setExcEdit({ playerId: player.id, draft: e.target.value })
                    }
                    placeholder="Reason (optional)"
                    maxLength={200}
                    autoFocus
                    className="flex-1 rounded border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveException(player, excEdit.draft)}
                    aria-label="Save exception"
                    className="flex h-10 w-10 items-center justify-center rounded bg-amber-500 text-white font-bold text-sm"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcEdit(null)}
                    aria-label="Cancel exception"
                    className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100 text-zinc-500 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-3 py-4">
        <a
          href="/fixtures"
          className="block w-full rounded bg-zinc-100 py-3 text-center text-sm font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:bg-zinc-200"
        >
          ← Back to fixtures
        </a>
      </div>

      {/* Toast error */}
      {toastError && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toastError}
        </div>
      )}
    </div>
  );
}
