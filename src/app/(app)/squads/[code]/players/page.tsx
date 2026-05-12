import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  injured: "Injured",
  unavailable: "Unavailable",
  inactive: "Inactive",
};

const STATUS_CLS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  injured: "bg-red-100 text-red-700",
  unavailable: "bg-yellow-100 text-yellow-700",
  inactive: "bg-zinc-100 text-zinc-500",
};

export default async function SquadPlayersPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createServerClient();

  const { data: squad } = await supabase
    .from("squads")
    .select("id, name, code")
    .eq("code", code)
    .single();

  if (!squad) notFound();

  const { data: players } = await supabase
    .from("players")
    .select(
      "id, display_name, preferred_position, jersey_number, status, date_of_birth",
    )
    .eq("squad_id", squad.id)
    .is("deleted_at", null)
    .order("jersey_number", { ascending: true, nullsFirst: false })
    .order("last_name", { ascending: true });

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{squad.name}</h1>
        <Link
          href={`/squads/${code}/players/new`}
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
        >
          Add player
        </Link>
      </div>

      {!players?.length ? (
        <p className="text-sm text-zinc-500">
          No players yet.{" "}
          <Link
            href={`/squads/${code}/players/new`}
            className="underline hover:text-zinc-700"
          >
            Add the first one.
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10">
          {players.map((p) => (
            <li key={p.id}>
              <Link
                href={`/players/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-black/[0.02] transition-colors"
              >
                <span className="w-8 text-right text-sm font-mono text-zinc-400">
                  {p.jersey_number != null ? `#${p.jersey_number}` : "—"}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {p.display_name}
                </span>
                <span className="text-xs text-zinc-500 w-8">
                  {p.preferred_position}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLS[p.status] ?? ""}`}
                >
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-zinc-400">
        {players?.length ?? 0} player{players?.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
