import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function U9PremierPage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "KP-U9-2026" })} />;
}
