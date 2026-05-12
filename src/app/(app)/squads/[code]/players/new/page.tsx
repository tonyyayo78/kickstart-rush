import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createPlayer } from "@/features/players/actions";
import PlayerForm from "@/features/players/PlayerForm";

export default async function NewPlayerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createServerClient();

  const { data: squad } = await supabase
    .from("squads")
    .select("name")
    .eq("code", code)
    .single();

  if (!squad) notFound();

  const action = createPlayer.bind(null, code);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">
        Add player — {squad.name}
      </h1>
      <PlayerForm
        action={action}
        submitLabel="Add player"
        cancelHref={`/squads/${code}/players`}
      />
    </div>
  );
}
