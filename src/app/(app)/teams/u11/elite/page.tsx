import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function U11ElitePage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "KE-U11-2026" })} />;
}
