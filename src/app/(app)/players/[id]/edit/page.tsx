import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { updatePlayer } from "@/features/players/actions";
import PlayerForm from "@/features/players/PlayerForm";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: player } = await supabase
    .from("players")
    .select(
      `id, first_name, last_name, preferred_position,
       jersey_number, status, date_of_birth, notes_summary,
       squads ( name, code )`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!player) notFound();

  const action = updatePlayer.bind(null, id);

  return (
    <div className="max-w-lg">
      <div className="mb-2 text-sm text-zinc-500">
        <Link href={`/players/${id}`} className="hover:underline">
          ← {player.first_name} {player.last_name}
        </Link>
      </div>
      <h1 className="mb-6 text-xl font-semibold">Edit player</h1>
      <PlayerForm
        action={action}
        defaultValues={{
          first_name: player.first_name,
          last_name: player.last_name,
          date_of_birth: player.date_of_birth,
          preferred_position: player.preferred_position as
            | "GK"
            | "DEF"
            | "MID"
            | "FWD",
          jersey_number: player.jersey_number,
          status: player.status as
            | "active"
            | "injured"
            | "unavailable"
            | "inactive",
          notes_summary: player.notes_summary,
        }}
        submitLabel="Save changes"
        cancelHref={`/players/${id}`}
      />
    </div>
  );
}
