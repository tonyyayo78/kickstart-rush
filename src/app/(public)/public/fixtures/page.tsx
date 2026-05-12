import { createAnonPublicClient } from "@/lib/supabase/anon-public";

const BARBADOS_TZ = "America/Barbados";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BARBADOS_TZ,
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
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
      <h1 className="mb-6 text-2xl font-bold">Fixtures</h1>

      {groups.size === 0 && (
        <p className="text-sm text-zinc-500">No fixtures scheduled.</p>
      )}

      {[...groups.entries()].map(([dateKey, dayFixtures]) => (
        <section key={dateKey} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {formatDate(dayFixtures[0].kickoff_at)}
          </h2>
          <ul className="flex flex-col gap-2">
            {dayFixtures.map((f, i) => {
              const isKickstart = f.home_is_kickstart || f.away_is_kickstart;
              return (
                <li
                  key={i}
                  className={`rounded-lg border px-4 py-3 ${
                    isKickstart
                      ? "border-blue-200 bg-blue-50"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span
                          className={
                            f.home_is_kickstart
                              ? "font-semibold text-blue-800"
                              : "font-medium"
                          }
                        >
                          {f.home_team_name}
                        </span>
                        <span className="text-xs text-zinc-400">vs</span>
                        <span
                          className={
                            f.away_is_kickstart
                              ? "font-semibold text-blue-800"
                              : "font-medium"
                          }
                        >
                          {f.away_team_name}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{f.venue}</p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="font-medium tabular-nums">
                        {formatTime(f.kickoff_at)}
                      </p>
                      {f.status !== "scheduled" && (
                        <p className="mt-0.5 text-xs capitalize text-zinc-400">
                          {f.status}
                        </p>
                      )}
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
