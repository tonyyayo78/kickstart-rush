import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function U9ElitePage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "KE-U9-2026" })} />;
}
