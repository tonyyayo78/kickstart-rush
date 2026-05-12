import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

const BARBADOS_TZ = "America/Barbados";

function formatDateHeader(iso: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${weekday} ${day} ${month}`.toUpperCase();
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-BB", {
    timeZone: BARBADOS_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function localDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBADOS_TZ,
  }).format(new Date(iso));
}

type ResultScore = { home_score: number; away_score: number };
type Team = { team_name: string; is_kickstart: boolean };
type FixtureRow = {
  id: string;
  kickoff_at: string;
  venue: string | null;
  status: string;
  home_team: Team;
  away_team: Team;
  results: ResultScore[] | null;
};

export default async function FixturesPage() {
  const supabase = await createServerClient();

  const { data: fixturesRaw } = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, venue, status, home_team:home_team_id(team_name, is_kickstart), away_team:away_team_id(team_name, is_kickstart), results!fixture_id(home_score, away_score)",
    )
    .order("kickoff_at", { ascending: true });

  const fixtures = (fixturesRaw ?? []) as unknown as FixtureRow[];

  const groups = new Map<string, FixtureRow[]>();
  for (const f of fixtures) {
    const key = localDateKey(f.kickoff_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Fixtures
      </h1>
      <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />

      {groups.size === 0 && (
        <p className="text-sm text-zinc-500">No fixtures yet.</p>
      )}

      {[...groups.entries()].map(([dateKey, dayFixtures]) => (
        <section key={dateKey} className="mb-8">
          <h2 className="mb-3 border-b border-zinc-200 pb-2 text-xl font-black uppercase tracking-tight text-black">
            {formatDateHeader(dayFixtures[0].kickoff_at)}
          </h2>
          <ul className="flex flex-col gap-2">
            {dayFixtures.map((f) => {
              const isKickstart =
                f.home_team.is_kickstart || f.away_team.is_kickstart;
              const score = f.results?.[0] ?? null;
              const isPlayed = f.status === "played" && score !== null;

              return (
                <li
                  key={f.id}
                  className={`rounded-lg border px-4 py-3 ${
                    isKickstart
                      ? "border-[#C7D3F5] bg-[#EEF2FF]"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    {/* Time or scoreline */}
                    <div className="sm:w-28 shrink-0">
                      {isPlayed ? (
                        <div>
                          <span className="font-black text-xl tabular-nums text-[#FFC726]">
                            {score.home_score} – {score.away_score}
                          </span>
                          <span className="block text-xs text-zinc-400">
                            Played
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium tabular-nums text-zinc-700">
                          {formatTime(f.kickoff_at)}
                        </span>
                      )}
                    </div>

                    {/* Team names */}
                    <div className="flex-1 text-sm">
                      <span
                        className={
                          f.home_team.is_kickstart
                            ? "font-bold text-[#00267F]"
                            : "font-medium"
                        }
                      >
                        {f.home_team.team_name}
                      </span>
                      <span className="mx-2 text-zinc-400">vs</span>
                      <span
                        className={
                          f.away_team.is_kickstart
                            ? "font-bold text-[#00267F]"
                            : "font-medium"
                        }
                      >
                        {f.away_team.team_name}
                      </span>
                    </div>

                    {/* Venue + action */}
                    <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
                      {f.venue && (
                        <span className="hidden text-xs text-zinc-400 sm:block">
                          {f.venue}
                        </span>
                      )}
                      <Link
                        href={`/fixtures/${f.id}/result`}
                        className="rounded bg-[#00267F] border-t border-t-[#3349A3] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {isPlayed ? "Edit result" : "Enter result"}
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
