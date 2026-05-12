import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { softDeletePlayer } from "@/features/players/actions";
import DeletePlayerButton from "@/features/players/DeletePlayerButton";

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

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

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: player } = await supabase
    .from("players")
    .select(
      `id, first_name, last_name, display_name, preferred_position,
       jersey_number, status, date_of_birth, notes_summary,
       squads ( id, name, code )`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!player) notFound();

  const squad = Array.isArray(player.squads) ? player.squads[0] : player.squads;
  const deleteAction = softDeletePlayer.bind(null, id, squad?.code ?? "");

  return (
    <div className="max-w-lg">
      <div className="mb-2 text-sm text-zinc-500">
        {squad && (
          <Link
            href={`/squads/${squad.code}/players`}
            className="hover:underline"
          >
            ← {squad.name}
          </Link>
        )}
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-black">
            {player.first_name} {player.last_name}
          </h1>
          {player.jersey_number != null && (
            <p className="text-sm text-zinc-500">#{player.jersey_number}</p>
          )}
        </div>
        <span
          className={`mt-1 rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLS[player.status] ?? ""}`}
        >
          {STATUS_LABEL[player.status] ?? player.status}
        </span>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-zinc-200 p-4">
        <div>
          <dt className="text-xs text-zinc-400">Position</dt>
          <dd className="text-sm font-medium">{player.preferred_position}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-400">Date of birth</dt>
          <dd className="text-sm font-medium">
            {player.date_of_birth}{" "}
            <span className="text-zinc-400">
              (age {calcAge(player.date_of_birth)})
            </span>
          </dd>
        </div>
        {player.notes_summary && (
          <div className="col-span-2">
            <dt className="text-xs text-zinc-400">Notes</dt>
            <dd className="text-sm">{player.notes_summary}</dd>
          </div>
        )}
      </dl>

      <div className="flex items-center gap-3">
        <Link
          href={`/players/${id}/edit`}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          Edit
        </Link>
        <DeletePlayerButton action={deleteAction} />
      </div>
    </div>
  );
}
