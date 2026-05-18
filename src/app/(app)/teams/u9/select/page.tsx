import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function U9SelectPage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "KS-U9-2026" })} />;
}
