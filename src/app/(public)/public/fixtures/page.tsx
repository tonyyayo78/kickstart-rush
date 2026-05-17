import { createAnonPublicClient } from "@/lib/supabase/anon-public";
import RealtimePublicRefresh from "@/features/public-realtime/RealtimePublicRefresh";

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

function compLabel(code: string): string {
  // BFA-2026-U11-A → U11-A, BFA-2026-U17 → U17
  const newFmt = code.match(/^BFA-2026-U(\d+)(?:-([A-Z]))?$/i);
  if (newFmt) return newFmt[2] ? `U${newFmt[1]}-${newFmt[2]}` : `U${newFmt[1]}`;
  // BFA-U15-2026-ZA → U15 ZA
  const oldFmt = code.match(/^BFA-U(\d+)-\d+-Z([A-Z])$/i);
  if (oldFmt) return `U${oldFmt[1]} Z${oldFmt[2]}`;
  return code;
}

type Fixture = {
  competition_code: string;
  competition_name: string;
  kickoff_at: string;
  venue: string;
  status: string;
  home_team_name: string;
  away_team_name: string;
  home_is_kickstart: boolean;
  away_is_kickstart: boolean;
  home_score: number | null;
  away_score: number | null;
};

export default async function PublicFixturesPage() {
  const supabase = await createAnonPublicClient();
  const { data: fixtures } = await supabase
    .from("public_fixtures")
    .select("*")
    .returns<Fixture[]>();

  const groups = new Map<string, Fixture[]>();
  for (const f of fixtures ?? []) {
    const key = localDateKey(f.kickoff_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  return (
    <div>
      <RealtimePublicRefresh />
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
        Fixtures
      </h1>
      <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />

      {groups.size === 0 && (
        <p className="text-sm text-zinc-500">No fixtures scheduled.</p>
      )}

      {[...groups.entries()].map(([dateKey, dayFixtures]) => {
        const compGroups = new Map<
          string,
          { name: string; fixtures: Fixture[] }
        >();
        for (const f of dayFixtures) {
          if (!compGroups.has(f.competition_code)) {
            compGroups.set(f.competition_code, {
              name: f.competition_name,
              fixtures: [],
            });
          }
          compGroups.get(f.competition_code)!.fixtures.push(f);
        }

        return (
          <section key={dateKey} className="mb-8">
            <h2 className="mb-3 border-b border-zinc-200 pb-2 text-xl font-black uppercase tracking-tight text-black">
              {formatDateHeader(dayFixtures[0].kickoff_at)}
            </h2>
            {[...compGroups.entries()].map(([code, cg]) => (
              <div key={code} className="mb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  {compLabel(code)}
                </p>
                <ul className="flex flex-col gap-2">
                  {cg.fixtures.map((f, i) => {
                    const isKickstart =
                      f.home_is_kickstart || f.away_is_kickstart;
                    const isPlayed =
                      f.status === "played" &&
                      f.home_score !== null &&
                      f.away_score !== null;

                    return (
                      <li
                        key={i}
                        className={`rounded-lg border px-4 py-3 ${
                          isKickstart
                            ? "border-[#C7D3F5] bg-[#EEF2FF]"
                            : "border-zinc-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                          <div className="sm:w-28 shrink-0">
                            {isPlayed ? (
                              <div>
                                <span className="font-black text-xl tabular-nums text-[#FFC726]">
                                  {f.home_score} – {f.away_score}
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

                          <div className="flex-1 text-sm">
                            <span
                              className={
                                f.home_is_kickstart
                                  ? "font-bold text-[#00267F]"
                                  : "font-medium"
                              }
                            >
                              {f.home_team_name}
                            </span>
                            <span className="mx-2 text-zinc-400">vs</span>
                            <span
                              className={
                                f.away_is_kickstart
                                  ? "font-bold text-[#00267F]"
                                  : "font-medium"
                              }
                            >
                              {f.away_team_name}
                            </span>
                          </div>

                          {f.venue && (
                            <p className="text-xs text-zinc-400 sm:shrink-0">
                              {f.venue}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
