"use client";
import { usePathname } from "next/navigation";

export function U15SubNav({
  hasElite,
  hasPremier,
}: {
  hasElite: boolean;
  hasPremier: boolean;
}) {
  const pathname = usePathname();

  const tabs = [
    { label: "Elite",   href: "/teams/u15/elite",   visible: hasElite },
    { label: "Premier", href: "/teams/u15/premier", visible: hasPremier },
  ].filter((t) => t.visible);

  if (tabs.length === 0) return null;

  return (
    <div className="flex gap-1 border-b border-border mb-6">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <a
            key={t.label}
            href={t.href}
            className={`relative border-b-2 border-transparent px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors -mb-px ${
              active
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </a>
        );
      })}
    </div>
  );
}
