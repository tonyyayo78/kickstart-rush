const AGE_GROUPS = [
  { label: "U15", href: "/teams/u15", active: true },
  { label: "U13", href: null },
  { label: "U11", href: null },
  { label: "U9",  href: null },
];

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">Teams</h1>
      <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />

      <div className="flex gap-1 border-b border-zinc-200 mb-0">
        {AGE_GROUPS.map((g) =>
          g.active ? (
            <a
              key={g.label}
              href={g.href!}
              className="border-b-2 border-[#00267F] px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#00267F] -mb-px"
            >
              {g.label}
            </a>
          ) : (
            <span
              key={g.label}
              className="flex items-center gap-1.5 border-b-2 border-transparent px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-300 cursor-not-allowed -mb-px"
            >
              {g.label}
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 normal-case tracking-normal">
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
