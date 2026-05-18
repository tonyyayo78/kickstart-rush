import SquadPlayersPage from "@/app/(app)/squads/[code]/players/page";

export default function U13PremierPage() {
  return <SquadPlayersPage params={Promise.resolve({ code: "KP-U13-2026" })} />;
}
