"use client";
import { usePathname } from "next/navigation";

const AGE_GROUPS = [
  { label: "U9",  href: "/teams/u9" },
  { label: "U11", href: "/teams/u11" },
  { label: "U13", href: "/teams/u13" },
  { label: "U15", href: "/teams/u15" },
  { label: "U17", href: "/teams/u17" },
];

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">Teams</h1>
      <div className="mt-2 mb-6 h-1 w-16 bg-[#FFC726]" />

      <div className="flex gap-1 border-b border-zinc-200 mb-0">
        {AGE_GROUPS.map((g) => {
          const active = pathname.startsWith(g.href);
          return (
            <a
              key={g.label}
              href={g.href}
              className={`border-b-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors -mb-px ${
                active
                  ? "border-[#00267F] text-[#00267F]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {g.label}
            </a>
          );
        })}
      </div>

      {children}
    </div>
  );
}
