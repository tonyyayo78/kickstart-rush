"use client";

import Link from "next/link";

export type FixtureActionsProps = {
  fixtureId: string;
  isKickstart: boolean;
  hasLineup: boolean;
  hasResult: boolean;
  isPlayed: boolean;
  matchState: string | null;
};

type Action = {
  key: "lineup" | "team-sheet" | "sub-cards" | "fees" | "live" | "result";
  label: string;
  href: string;
  variant: "primary" | "primary-done" | "outline";
};

const NAV_PRIMARY =
  "rounded bg-[#00267F] border-t border-t-[#3349A3] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0";
const NAV_DONE =
  "rounded bg-emerald-600 border-t border-t-emerald-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm shadow-emerald-600/30 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0";
const NAV_OUTLINE =
  "rounded border border-zinc-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:border-[#00267F] hover:text-[#00267F]";
const MENU_ITEM =
  "block px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-700 hover:bg-zinc-100";
const SUMMARY_BTN =
  "list-none cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:border-[#00267F] hover:text-[#00267F] [&::-webkit-details-marker]:hidden";

function pickPrimary(props: FixtureActionsProps): Action {
  const { fixtureId, hasResult, isPlayed } = props;
  const done = hasResult || isPlayed;
  return {
    key: "result",
    label: done ? "Update result" : "Enter result",
    href: `/fixtures/${fixtureId}/result`,
    variant: done ? "primary-done" : "primary",
  };
}

function buildOverflow(props: FixtureActionsProps): Action[] {
  if (!props.isKickstart) return [];
  const { fixtureId, hasLineup, matchState } = props;
  const liveLabel =
    ["h1", "h1_stoppage", "h2", "h2_stoppage"].includes(matchState ?? "")
      ? "Live Tracker"
      : matchState === "halftime"
        ? "Live · HT"
        : matchState === "full_time"
          ? "Match Events"
          : "Live Tracker";

  return [
    { key: "lineup", label: hasLineup ? "Lineup ✓" : "Lineup", href: `/fixtures/${fixtureId}/lineup`, variant: "outline" },
    { key: "team-sheet", label: "Team Sheet", href: `/fixtures/${fixtureId}/team-sheet`, variant: "outline" },
    { key: "sub-cards", label: "Sub Cards", href: `/fixtures/${fixtureId}/sub-cards`, variant: "outline" },
    { key: "fees", label: "Fees", href: `/fixtures/${fixtureId}/fees`, variant: "outline" },
    { key: "live", label: liveLabel, href: `/fixtures/${fixtureId}/live`, variant: "outline" },
  ];
}

export default function FixtureActions(props: FixtureActionsProps) {
  const primary = pickPrimary(props);
  const overflow = buildOverflow(props);

  const primaryClass =
    primary.variant === "primary-done"
      ? NAV_DONE
      : primary.variant === "primary"
        ? NAV_PRIMARY
        : NAV_OUTLINE;

  return (
    <div className="flex items-center gap-2">
      <Link href={primary.href} className={primaryClass}>
        {primary.label}
      </Link>

      {overflow.length > 0 && (
        <details className="relative">
          <summary className={SUMMARY_BTN} aria-label="More fixture actions">
            ⋯
          </summary>
          <div
            role="menu"
            className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {overflow.map((a) => (
              <Link key={a.key} href={a.href} role="menuitem" className={MENU_ITEM}>
                {a.label}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
