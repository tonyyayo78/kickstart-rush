const AGE_GROUPS = [
  { label: "U15", href: "/teams/u15", active: true },
  { label: "U13", href: null },
  { label: "U11", href: null },
  { label: "U9",  href: null },
];

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Teams</h1>
      <div className="mt-2 mb-6 h-1 w-12 rounded-full bg-accent" />

      <div className="flex gap-1 border-b border-border mb-0">
        {AGE_GROUPS.map((g) =>
          g.active ? (
            <a
              key={g.label}
              href={g.href!}
              className="relative border-b-2 border-transparent px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent -mb-px"
            >
              {g.label}
            </a>
          ) : (
            <span
              key={g.label}
              className="flex items-center gap-1.5 border-b-2 border-transparent px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground/40 cursor-not-allowed -mb-px"
            >
              {g.label}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 normal-case tracking-normal">
                Soon
              </span>
            </span>
          )
        )}
      </div>

      {children}
    </div>
  );
}
