import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

const BARBADOS_TZ = "America/Barbados";

function formatFixtureDate(iso: string): string {
  return new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function formatFixtureTime(iso: string): string {
  return new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatCash(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

type TeamInfo = {
  team_name: string;
  is_kickstart: boolean;
};

type FixtureRow = {
  id: string;
  kickoff_at: string;
  venue: string | null;
  home_team: TeamInfo;
  away_team: TeamInfo;
};

type FeeRow = {
  fixture_id: string;
  status: "paid" | "exception";
  amount: number;
};

type FixtureFees = {
  paid: number;
  exceptions: number;
  cashCents: number;
};

export default async function FeesPage() {
  const supabase = await createServerClient();

  const [{ data: fixturesRaw }, { data: feesRaw }] = await Promise.all([
    supabase
      .from("fixtures")
      .select(
        "id, kickoff_at, venue, home_team:home_team_id(team_name, is_kickstart), away_team:away_team_id(team_name, is_kickstart)",
      )
      .order("kickoff_at", { ascending: true }),
    supabase
      .from("match_fees")
      .select("fixture_id, status, amount")
      .returns<FeeRow[]>(),
  ]);

  const allFixtures = (fixturesRaw ?? []) as unknown as FixtureRow[];

  // Only show fixtures involving a Kickstart team
  const fixtures = allFixtures.filter(
    (f) => f.home_team.is_kickstart || f.away_team.is_kickstart,
  );

  // Aggregate fee rows by fixture_id
  const feesByFixture = new Map<string, FixtureFees>();
  for (const fee of feesRaw ?? []) {
    const existing = feesByFixture.get(fee.fixture_id) ?? {
      paid: 0,
      exceptions: 0,
      cashCents: 0,
    };
    if (fee.status === "paid") {
      existing.paid += 1;
      existing.cashCents += fee.amount;
    } else {
      existing.exceptions += 1;
    }
    feesByFixture.set(fee.fixture_id, existing);
  }

  // Season totals
  let totalCashCents = 0;
  let totalPaid = 0;
  let totalExceptions = 0;
  for (const stats of feesByFixture.values()) {
    totalCashCents += stats.cashCents;
    totalPaid += stats.paid;
    totalExceptions += stats.exceptions;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Fees Overview
      </h1>
      <div className="mt-2 mb-3 h-1 w-16 bg-[#FFC726]" />
      <p className="mb-6 text-sm text-zinc-500">Record who paid match fees</p>

      {/* Season summary strip */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Collected
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[#00267F]">
            {formatCash(totalCashCents)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Paid
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-green-700">
            {totalPaid}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Exceptions
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-amber-600">
            {totalExceptions}
          </p>
        </div>
      </div>

      {fixtures.length === 0 && (
        <p className="text-sm text-zinc-500">No Kickstart fixtures yet.</p>
      )}

      {/* Fixture list */}
      <div className="flex flex-col gap-2">
        {fixtures.map((f) => {
          const fees = feesByFixture.get(f.id);
          const kickstartTeam = f.home_team.is_kickstart
            ? f.home_team
            : f.away_team;
          const opponent = f.home_team.is_kickstart
            ? f.away_team
            : f.home_team;
          const isHome = f.home_team.is_kickstart;
          const hasActivity = fees != null;

          return (
            <div
              key={f.id}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center"
            >
              {/* Date + time */}
              <div className="w-28 shrink-0">
                <p className="text-sm font-bold tabular-nums text-zinc-800">
                  {formatFixtureDate(f.kickoff_at)}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatFixtureTime(f.kickoff_at)}
                  {f.venue ? ` · ${f.venue}` : ""}
                </p>
              </div>

              {/* Matchup */}
              <div className="flex-1 text-sm">
                <span className="font-bold text-[#00267F]">
                  {kickstartTeam.team_name}
                </span>
                <span className="mx-1.5 text-zinc-400">
                  {isHome ? "vs" : "@"}
                </span>
                <span className="font-medium text-zinc-700">
                  {opponent.team_name}
                </span>
              </div>

              {/* Fee stats */}
              <div className="flex items-center gap-2 sm:shrink-0">
                {hasActivity ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                      {fees.paid} paid
                    </span>
                    {fees.exceptions > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        {fees.exceptions} exc
                      </span>
                    )}
                    <span className="w-14 text-right text-sm font-black tabular-nums text-[#00267F]">
                      {formatCash(fees.cashCents)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-zinc-400">No records yet</span>
                )}
              </div>

              {/* Link */}
              <div className="sm:shrink-0">
                <Link
                  href={`/fixtures/${f.id}/fees`}
                  className="inline-block rounded border border-zinc-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:border-[#00267F] hover:text-[#00267F]"
                >
                  {hasActivity ? "View / Edit" : "Collect"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
