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
  variant: "primary" | "primary-live" | "primary-done" | "outline";
};

const NAV_PRIMARY =
  "rounded bg-[#00267F] border-t border-t-[#3349A3] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm shadow-[#00267F]/30 transition-all hover:-translate-y-0.5 active:translate-y-0";
const NAV_LIVE =
  "inline-flex items-center gap-1 rounded border border-red-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600 transition-colors hover:border-red-500 hover:text-red-700";
const NAV_DONE =
  "rounded bg-emerald-600 border-t border-t-emerald-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm shadow-emerald-600/30 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0";
const NAV_OUTLINE =
  "rounded border border-zinc-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:border-[#00267F] hover:text-[#00267F]";
const MENU_ITEM =
  "block px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-700 hover:bg-zinc-100";
const SUMMARY_BTN =
  "list-none cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:border-[#00267F] hover:text-[#00267F] [&::-webkit-details-marker]:hidden";

function pickPrimary(props: FixtureActionsProps): Action {
  const { fixtureId, isKickstart, hasLineup, hasResult, isPlayed, matchState } = props;

  if (!isKickstart) {
    const done = hasResult || isPlayed;
    return {
      key: "result",
      label: done ? "Update result" : "Enter result",
      href: `/fixtures/${fixtureId}/result`,
      variant: done ? "primary-done" : "primary",
    };
  }
  if (["h1", "h1_stoppage", "h2", "h2_stoppage"].includes(matchState ?? "")) {
    return { key: "live", label: "Live · LIVE", href: `/fixtures/${fixtureId}/live`, variant: "primary-live" };
  }
  if (matchState === "halftime") {
    return { key: "live", label: "Live · HT", href: `/fixtures/${fixtureId}/live`, variant: "primary-live" };
  }
  if (isPlayed || hasResult) {
    return { key: "result", label: "Update result", href: `/fixtures/${fixtureId}/result`, variant: "primary-done" };
  }
  if (matchState === "full_time") {
    return { key: "result", label: "Enter result", href: `/fixtures/${fixtureId}/result`, variant: "primary" };
  }
  if (hasLineup) {
    return { key: "team-sheet", label: "Team Sheet", href: `/fixtures/${fixtureId}/team-sheet`, variant: "outline" };
  }
  return { key: "lineup", label: "Lineup", href: `/fixtures/${fixtureId}/lineup`, variant: "outline" };
}

function buildOverflow(props: FixtureActionsProps, primaryKey: Action["key"]): Action[] {
  if (!props.isKickstart) return [];
  const { fixtureId, hasLineup, hasResult, isPlayed, matchState } = props;
  const liveInProgress = ["h1", "h1_stoppage", "h2", "h2_stoppage"].includes(matchState ?? "");
  const liveLabel = liveInProgress
    ? "Live Tracker"
    : matchState === "halftime"
      ? "Live · HT"
      : matchState === "full_time"
        ? "Match Events"
        : "Live Tracker";

  const all: Action[] = [
    { key: "lineup", label: hasLineup ? "Lineup ✓" : "Lineup", href: `/fixtures/${fixtureId}/lineup`, variant: "outline" },
    { key: "team-sheet", label: "Team Sheet", href: `/fixtures/${fixtureId}/team-sheet`, variant: "outline" },
    { key: "sub-cards", label: "Sub Cards", href: `/fixtures/${fixtureId}/sub-cards`, variant: "outline" },
    { key: "fees", label: "Fees", href: `/fixtures/${fixtureId}/fees`, variant: "outline" },
    { key: "live", label: liveLabel, href: `/fixtures/${fixtureId}/live`, variant: "outline" },
    {
      key: "result",
      label: hasResult || isPlayed ? "Update result" : "Enter result",
      href: `/fixtures/${fixtureId}/result`,
      variant: "outline",
    },
  ];
  return all.filter((a) => a.key !== primaryKey);
}

export default function FixtureActions(props: FixtureActionsProps) {
  const primary = pickPrimary(props);
  const overflow = buildOverflow(props, primary.key);

  const primaryClass =
    primary.variant === "primary-live"
      ? NAV_LIVE
      : primary.variant === "primary-done"
        ? NAV_DONE
        : primary.variant === "primary"
          ? NAV_PRIMARY
          : NAV_OUTLINE;

  return (
    <div className="flex items-center gap-2">
      <Link href={primary.href} className={primaryClass}>
        {primary.variant === "primary-live" && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle" />
        )}
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
