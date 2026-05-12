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
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-black">
            {squad.name}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {players?.length ?? 0} player{players?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`/squads/${code}/players/new`}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-blue-700"
        >
          Add player
        </Link>
      </div>

      {!players?.length ? (
        <p className="text-sm text-zinc-500">
          No players yet.{" "}
          <Link
            href={`/squads/${code}/players/new`}
            className="text-blue-600 underline hover:text-blue-700"
          >
            Add the first one.
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-100 text-left text-xs font-bold uppercase tracking-wide text-zinc-600">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 sm:table-cell">Position</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {players.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-right text-zinc-400">
                    {p.jersey_number != null ? `#${p.jersey_number}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${p.id}`}
                      className="font-medium hover:text-blue-600 transition-colors"
                    >
                      {p.display_name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                    {p.preferred_position}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLS[p.status] ?? ""}`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
