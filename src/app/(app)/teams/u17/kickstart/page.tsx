import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function U17KickstartPage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "K-U17-2026" })} />;
}
