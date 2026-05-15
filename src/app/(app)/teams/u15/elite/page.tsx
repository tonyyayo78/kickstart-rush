import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function ElitePage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "KE2026" })} />;
}
