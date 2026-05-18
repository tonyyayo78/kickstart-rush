"use client";
import { usePathname } from "next/navigation";

export function U11SubNav({
  hasElite,
  hasPremier,
}: {
  hasElite: boolean;
  hasPremier: boolean;
}) {
  const pathname = usePathname();

  const tabs = [
    { label: "Elite",   href: "/teams/u11/elite",   visible: hasElite },
    { label: "Premier", href: "/teams/u11/premier", visible: hasPremier },
  ].filter((t) => t.visible);

  if (tabs.length === 0) return null;

  return (
    <div className="flex gap-1 border-b border-zinc-200 mb-6">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <a
            key={t.label}
            href={t.href}
            className={`border-b-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors -mb-px ${
              active
                ? "border-[#00267F] text-[#00267F]"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
          </a>
        );
      })}
    </div>
  );
}
