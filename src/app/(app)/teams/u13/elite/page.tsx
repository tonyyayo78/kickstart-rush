import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function U13ElitePage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "KE-U13-2026" })} />;
}
