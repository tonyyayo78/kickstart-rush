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
  active:      "bg-success/10 text-success border border-success/20",
  injured:     "bg-destructive/10 text-destructive border border-destructive/20",
  unavailable: "bg-warning/10 text-warning-foreground border border-warning/20",
  inactive:    "bg-muted text-muted-foreground border border-border",
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
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {squad.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {players?.length ?? 0} player{players?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`/squads/${code}/players/new`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-gradient-to-br hover:from-primary hover:to-[hsl(219_70%_30%)] active:scale-[0.98]"
        >
          Add player
        </Link>
      </div>

      {!players?.length ? (
        <p className="text-sm text-muted-foreground">
          No players yet.{" "}
          <Link
            href={`/squads/${code}/players/new`}
            className="text-primary underline hover:text-primary/80"
          >
            Add the first one.
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 sm:table-cell">Position</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {players.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-right tabular-nums text-muted-foreground">
                    {p.jersey_number != null ? `#${p.jersey_number}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${p.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {p.display_name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {p.preferred_position}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[p.status] ?? "bg-muted text-muted-foreground border border-border"}`}
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
