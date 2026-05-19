"use client";
import { useState, useTransition } from "react";
import type { ResultActionState } from "@/features/results/actions";

type Player = {
  id: string;
  display_name: string;
  preferred_position: string;
};

type Team = {
  id: string;
  name: string;
};

type ScorerEntry = {
  key: string;
  competitionTeamId: string;
  playerId: string;
  minute: string;
  isOwnGoal: boolean;
};

type CardRow = {
  id: string;
  player_id: string;
  card_type: string;
  minute: number | null;
  note: string | null;
};

type CardEntry = {
  key: string;
  playerId: string;
  cardType: "yellow" | "red" | "second_yellow";
  minute: string;
  note: string;
};

type ExistingResult = {
  id: string;
  home_score: number;
  away_score: number;
  match_notes: string | null;
  goals: {
    id: string;
    competition_team_id: string;
    player_id: string | null;
    minute: number | null;
    is_own_goal: boolean;
  }[];
};

type Props = {
  fixtureId: string;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  kickstartPlayers: Player[];
  existingCards: CardRow[];
  createAction: (input: unknown) => Promise<ResultActionState>;
  updateAction: ((input: unknown) => Promise<ResultActionState>) | null;
  existingResult: ExistingResult | null;
};

const inputCls =
  "w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]";

const CARD_TYPES: { value: CardEntry["cardType"]; label: string }[] = [
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
  { value: "second_yellow", label: "2nd Yellow" },
];

const CARD_PILL: Record<CardEntry["cardType"], string> = {
  yellow: "bg-yellow-400 text-yellow-900",
  red: "bg-red-600 text-white",
  second_yellow: "bg-orange-400 text-orange-900",
};

const CARD_BUTTON_ACTIVE: Record<CardEntry["cardType"], string> = {
  yellow: "border-yellow-400 bg-yellow-100 text-yellow-900",
  red: "border-red-500 bg-red-100 text-red-800",
  second_yellow: "border-orange-400 bg-orange-100 text-orange-800",
};

function newScorer(teamId: string): ScorerEntry {
  return {
    key: crypto.randomUUID(),
    competitionTeamId: teamId,
    playerId: "",
    minute: "",
    isOwnGoal: false,
  };
}

function newCard(): CardEntry {
  return {
    key: crypto.randomUUID(),
    playerId: "",
    cardType: "yellow",
    minute: "",
    note: "",
  };
}

function initialScorers(existingResult: ExistingResult | null): ScorerEntry[] {
  if (!existingResult?.goals.length) return [];
  return existingResult.goals.map((g) => ({
    key: crypto.randomUUID(),
    competitionTeamId: g.competition_team_id,
    playerId: g.player_id ?? "",
    minute: g.minute != null ? String(g.minute) : "",
    isOwnGoal: g.is_own_goal,
  }));
}

function initialCards(existingCards: CardRow[]): CardEntry[] {
  return existingCards.map((c) => ({
    key: crypto.randomUUID(),
    playerId: c.player_id,
    cardType: c.card_type as CardEntry["cardType"],
    minute: c.minute != null ? String(c.minute) : "",
    note: c.note ?? "",
  }));
}

export default function ResultForm({
  fixtureId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  kickstartPlayers,
  existingCards,
  createAction,
  updateAction,
  existingResult,
}: Props) {
  const isEdit = existingResult !== null;
  const action = (updateAction ?? createAction) as (
    input: unknown,
  ) => Promise<ResultActionState>;

  const [error, setError] = useState<string | null>(null);

  const [homeScore, setHomeScore] = useState(existingResult?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(existingResult?.away_score ?? 0);
  const [matchNotes, setMatchNotes] = useState(existingResult?.match_notes ?? "");
  const [scorers, setScorers] = useState<ScorerEntry[]>(() =>
    initialScorers(existingResult),
  );
  const [cards, setCards] = useState<CardEntry[]>(() => initialCards(existingCards));
  const [pending, startTransition] = useTransition();

  const homeScorers = scorers.filter((s) => s.competitionTeamId === homeTeam.id).length;
  const awayScorers = scorers.filter((s) => s.competitionTeamId === awayTeam.id).length;
  const homeTooMany = homeScorers > homeScore;
  const awayTooMany = awayScorers > awayScore;
  const homeUnder = homeScore > 0 && homeScorers < homeScore;
  const awayUnder = awayScore > 0 && awayScorers < awayScore;

  // Soft warning: a player shouldn't have 2 yellows + a second_yellow in the same fixture.
  const doubleYellowWarnings: string[] = [];
  if (cards.length > 0) {
    const counts: Record<string, { yellow: number; second_yellow: number }> = {};
    for (const c of cards) {
      if (!c.playerId) continue;
      if (!counts[c.playerId]) counts[c.playerId] = { yellow: 0, second_yellow: 0 };
      if (c.cardType === "yellow") counts[c.playerId].yellow++;
      if (c.cardType === "second_yellow") counts[c.playerId].second_yellow++;
    }
    for (const [pid, { yellow, second_yellow }] of Object.entries(counts)) {
      if (yellow >= 2 && second_yellow >= 1) {
        const name =
          kickstartPlayers.find((p) => p.id === pid)?.display_name ?? "Unknown player";
        doubleYellowWarnings.push(name);
      }
    }
  }

  function addScorer(teamId: string) {
    setScorers((prev) => [...prev, newScorer(teamId)]);
  }

  function removeScorer(key: string) {
    setScorers((prev) => prev.filter((s) => s.key !== key));
  }

  function updateScorer(key: string, patch: Partial<Omit<ScorerEntry, "key">>) {
    setScorers((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function addCard() {
    setCards((prev) => [...prev, newCard()]);
  }

  function removeCard(key: string) {
    setCards((prev) => prev.filter((c) => c.key !== key));
  }

  function updateCard(key: string, patch: Partial<Omit<CardEntry, "key">>) {
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const incompleteCard = cards.find((c) => !c.playerId);
    if (incompleteCard) {
      setError("Please select a player for each card, or remove the incomplete row.");
      return;
    }

    const input = {
      fixtureId,
      homeScore,
      awayScore,
      matchNotes: matchNotes.trim() || undefined,
      scorers: scorers.map((s) => ({
        competitionTeamId: s.competitionTeamId,
        playerId: s.playerId || null,
        minute: s.minute ? parseInt(s.minute, 10) : null,
        isOwnGoal: s.isOwnGoal,
      })),
      cards: cards.map((c) => ({
        playerId: c.playerId,
        cardType: c.cardType,
        minute: c.minute ? parseInt(c.minute, 10) : null,
        note: c.note.trim() || undefined,
      })),
    };

    startTransition(async () => {
      const result = await action(input);
      if (result?.error) {
        setError(result.error);
      }
      // On success, action redirects — component unmounts before this line runs
    });
  }

  const playersFor = (teamId: string) =>
    teamId === homeTeam.id ? homePlayers : awayPlayers;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Score */}
      <fieldset className="flex items-center gap-4">
        <legend className="mb-2 text-sm font-medium sr-only">Score</legend>
        <div className="flex flex-col items-center gap-1">
          <label className="text-xs text-zinc-500">{homeTeam.name}</label>
          <input
            type="number"
            min={0}
            max={99}
            required
            value={homeScore}
            onChange={(e) => setHomeScore(parseInt(e.target.value, 10) || 0)}
            className="w-20 rounded-md border border-black/10 px-3 py-2 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#00267F]"
            aria-label={`${homeTeam.name} score`}
          />
        </div>
        <span className="mt-4 text-xl font-light text-zinc-400">–</span>
        <div className="flex flex-col items-center gap-1">
          <label className="text-xs text-zinc-500">{awayTeam.name}</label>
          <input
            type="number"
            min={0}
            max={99}
            required
            value={awayScore}
            onChange={(e) => setAwayScore(parseInt(e.target.value, 10) || 0)}
            className="w-20 rounded-md border border-black/10 px-3 py-2 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#00267F]"
            aria-label={`${awayTeam.name} score`}
          />
        </div>
      </fieldset>

      {/* Scorer count hints */}
      {homeTooMany && (
        <p className="text-xs text-red-600">
          Too many {homeTeam.name} scorers ({homeScorers}) for the score ({homeScore}).
        </p>
      )}
      {awayTooMany && (
        <p className="text-xs text-red-600">
          Too many {awayTeam.name} scorers ({awayScorers}) for the score ({awayScore}).
        </p>
      )}
      {!homeTooMany && homeUnder && (
        <p className="text-xs text-zinc-400">
          {homeTeam.name}: {homeScore - homeScorers} goal
          {homeScore - homeScorers !== 1 ? "s" : ""} without a scorer listed.
        </p>
      )}
      {!awayTooMany && awayUnder && (
        <p className="text-xs text-zinc-400">
          {awayTeam.name}: {awayScore - awayScorers} goal
          {awayScore - awayScorers !== 1 ? "s" : ""} without a scorer listed.
        </p>
      )}

      {/* Scorers */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Scorers</h2>

        {scorers.length === 0 && (
          <p className="text-xs text-zinc-400">No scorers added yet.</p>
        )}

        {scorers.map((s) => {
          const players = playersFor(s.competitionTeamId);
          return (
            <div
              key={s.key}
              className="flex flex-wrap items-end gap-2 rounded-md border border-black/10 p-3"
            >
              {/* Team */}
              <div className="flex flex-col gap-1 w-36">
                <label className="text-xs text-zinc-500">Team</label>
                <select
                  value={s.competitionTeamId}
                  onChange={(e) =>
                    updateScorer(s.key, {
                      competitionTeamId: e.target.value,
                      playerId: "",
                    })
                  }
                  className={inputCls}
                  aria-label="Scoring team"
                >
                  <option value={homeTeam.id}>{homeTeam.name}</option>
                  <option value={awayTeam.id}>{awayTeam.name}</option>
                </select>
              </div>

              {/* Player */}
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-xs text-zinc-500">Player (optional)</label>
                <select
                  value={s.playerId}
                  onChange={(e) => updateScorer(s.key, { playerId: e.target.value })}
                  className={inputCls}
                  aria-label="Scorer player"
                >
                  <option value="">Unknown</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute */}
              <div className="flex flex-col gap-1 w-20">
                <label className="text-xs text-zinc-500">Minute</label>
                <input
                  type="number"
                  min={1}
                  max={130}
                  placeholder="—"
                  value={s.minute}
                  onChange={(e) => updateScorer(s.key, { minute: e.target.value })}
                  className={inputCls}
                  aria-label="Goal minute"
                />
              </div>

              {/* OG toggle */}
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.isOwnGoal}
                  onChange={(e) => updateScorer(s.key, { isOwnGoal: e.target.checked })}
                  className="rounded"
                />
                OG
              </label>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeScorer(s.key)}
                className="mb-2 text-xs text-zinc-400 hover:text-red-500 transition-colors"
                aria-label="Remove scorer"
              >
                Remove
              </button>
            </div>
          );
        })}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addScorer(homeTeam.id)}
            className="rounded-md border border-black/10 px-3 py-1.5 text-xs text-zinc-600 hover:bg-black/5 transition-colors"
          >
            + {homeTeam.name} goal
          </button>
          <button
            type="button"
            onClick={() => addScorer(awayTeam.id)}
            className="rounded-md border border-black/10 px-3 py-1.5 text-xs text-zinc-600 hover:bg-black/5 transition-colors"
          >
            + {awayTeam.name} goal
          </button>
        </div>
      </div>

      {/* Cards — Kickstart players only */}
      {kickstartPlayers.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Cards</h2>

          {doubleYellowWarnings.length > 0 && (
            <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              Warning:{" "}
              {doubleYellowWarnings.join(", ")}{" "}
              {doubleYellowWarnings.length === 1 ? "has" : "have"} 2 yellows and a 2nd yellow
              in this fixture — check the card entries.
            </p>
          )}

          {cards.length === 0 && (
            <p className="text-xs text-zinc-400">No cards added yet.</p>
          )}

          {cards.map((c) => (
            <div
              key={c.key}
              className="flex flex-wrap items-end gap-2 rounded-md border border-black/10 p-3"
            >
              {/* Player */}
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-xs text-zinc-500">Player</label>
                <select
                  value={c.playerId}
                  onChange={(e) => updateCard(c.key, { playerId: e.target.value })}
                  className={inputCls}
                  aria-label="Booked player"
                >
                  <option value="">Select player…</option>
                  {kickstartPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Card type */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Card</span>
                <div className="flex rounded-md border border-black/10 overflow-hidden">
                  {CARD_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => updateCard(c.key, { cardType: ct.value })}
                      className={`px-2.5 py-2 text-xs font-medium transition-colors ${
                        c.cardType === ct.value
                          ? CARD_BUTTON_ACTIVE[ct.value]
                          : "bg-white text-zinc-500 hover:bg-zinc-50"
                      }`}
                      aria-label={`${ct.label} card`}
                      aria-pressed={c.cardType === ct.value}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minute */}
              <div className="flex flex-col gap-1 w-20">
                <label className="text-xs text-zinc-500">Minute</label>
                <input
                  type="number"
                  min={0}
                  max={130}
                  placeholder="—"
                  value={c.minute}
                  onChange={(e) => updateCard(c.key, { minute: e.target.value })}
                  className={inputCls}
                  aria-label="Card minute"
                />
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <label className="text-xs text-zinc-500">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. dissent"
                  value={c.note}
                  maxLength={200}
                  onChange={(e) => updateCard(c.key, { note: e.target.value })}
                  className={inputCls}
                  aria-label="Card note"
                />
              </div>

              {/* Card type pill preview */}
              <span
                className={`mb-2 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${CARD_PILL[c.cardType]}`}
              >
                {c.cardType === "second_yellow" ? "2Y" : c.cardType === "yellow" ? "Y" : "R"}
              </span>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeCard(c.key)}
                className="mb-2 text-xs text-zinc-400 hover:text-red-500 transition-colors"
                aria-label="Remove card"
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addCard}
            className="self-start rounded-md border border-black/10 px-3 py-1.5 text-xs text-zinc-600 hover:bg-black/5 transition-colors"
          >
            + Add card
          </button>
        </div>
      )}

      {/* Match notes */}
      <div className="flex flex-col gap-1">
        <label htmlFor="match_notes" className="text-sm font-medium">
          Match notes (optional)
        </label>
        <textarea
          id="match_notes"
          rows={3}
          value={matchNotes}
          onChange={(e) => setMatchNotes(e.target.value)}
          className={inputCls}
          maxLength={5000}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || homeTooMany || awayTooMany}
          className="rounded-md bg-[#00267F] border-t border-t-[#3349A3] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Update result" : "Save result"}
        </button>
        <a
          href="/fixtures"
          className="text-sm text-zinc-500 hover:text-zinc-700 underline"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
