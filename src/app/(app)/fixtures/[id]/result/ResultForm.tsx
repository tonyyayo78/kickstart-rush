"use client";
import { useState } from "react";
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
  createAction: (input: unknown) => Promise<ResultActionState>;
  updateAction: ((input: unknown) => Promise<ResultActionState>) | null;
  existingResult: ExistingResult | null;
};

const inputCls =
  "w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00267F]";

function newScorer(teamId: string): ScorerEntry {
  return {
    key: crypto.randomUUID(),
    competitionTeamId: teamId,
    playerId: "",
    minute: "",
    isOwnGoal: false,
  };
}

function initialScorers(
  existingResult: ExistingResult | null,
): ScorerEntry[] {
  if (!existingResult?.goals.length) return [];
  return existingResult.goals.map((g) => ({
    key: crypto.randomUUID(),
    competitionTeamId: g.competition_team_id,
    playerId: g.player_id ?? "",
    minute: g.minute != null ? String(g.minute) : "",
    isOwnGoal: g.is_own_goal,
  }));
}

export default function ResultForm({
  fixtureId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  createAction,
  updateAction,
  existingResult,
}: Props) {
  const isEdit = existingResult !== null;
  const action = (updateAction ?? createAction) as (
    input: unknown,
  ) => Promise<ResultActionState>;

  const [error, setError] = useState<string | null>(null);

  const [homeScore, setHomeScore] = useState(
    existingResult?.home_score ?? 0,
  );
  const [awayScore, setAwayScore] = useState(
    existingResult?.away_score ?? 0,
  );
  const [matchNotes, setMatchNotes] = useState(
    existingResult?.match_notes ?? "",
  );
  const [scorers, setScorers] = useState<ScorerEntry[]>(() =>
    initialScorers(existingResult),
  );
  const [submitting, setSubmitting] = useState(false);

  const homeScorers = scorers.filter((s) => s.competitionTeamId === homeTeam.id).length;
  const awayScorers = scorers.filter((s) => s.competitionTeamId === awayTeam.id).length;
  const homeTooMany = homeScorers > homeScore;
  const awayTooMany = awayScorers > awayScore;
  const homeUnder = homeScore > 0 && homeScorers < homeScore;
  const awayUnder = awayScore > 0 && awayScorers < awayScore;

  function addScorer(teamId: string) {
    setScorers((prev) => [...prev, newScorer(teamId)]);
  }

  function removeScorer(key: string) {
    setScorers((prev) => prev.filter((s) => s.key !== key));
  }

  function updateScorer(key: string, patch: Partial<Omit<ScorerEntry, "key">>) {
    setScorers((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const input = {
      fixtureId,
      homeScore,
      awayScore,
      matchNotes: matchNotes.trim() || undefined,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      scorers: scorers.map((s) => ({
        competitionTeamId: s.competitionTeamId,
        playerId: s.playerId || null,
        minute: s.minute ? parseInt(s.minute, 10) : null,
        isOwnGoal: s.isOwnGoal,
      })),
    };

    const result = await action(input);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success, action redirects — component unmounts
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
          {homeTeam.name}: {homeScore - homeScorers} goal{homeScore - homeScorers !== 1 ? "s" : ""} without a scorer listed.
        </p>
      )}
      {!awayTooMany && awayUnder && (
        <p className="text-xs text-zinc-400">
          {awayTeam.name}: {awayScore - awayScorers} goal{awayScore - awayScorers !== 1 ? "s" : ""} without a scorer listed.
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
          disabled={submitting || homeTooMany || awayTooMany}
          className="rounded-md bg-[#00267F] border-t border-t-[#3349A3] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {submitting ? "Saving…" : isEdit ? "Update result" : "Save result"}
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
