import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function PremierPage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "KP2026" })} />;
}
