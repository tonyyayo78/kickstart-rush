"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AGE_GROUPS, type AgeFilter, parseAgeParam } from "./age-filter";

export default function AgeFilterPills() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = parseAgeParam(searchParams.get("age") ?? undefined);

  function select(filter: AgeFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("age", filter);
    // Use replace so successive filter changes don't pollute history
    router.replace(`${pathname}?${params.toString()}`);
  }

  const options: { value: AgeFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...AGE_GROUPS.map((g) => ({ value: g as AgeFilter, label: g })),
  ];

  return (
    <nav
      aria-label="Age group filter"
      className="mb-6 flex flex-wrap items-center gap-2"
    >
      {options.map((opt) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => select(opt.value)}
            aria-pressed={active}
            className={
              active
                ? "rounded-full bg-[#00267F] px-4 py-1.5 text-sm font-bold text-white"
                : "rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-[#00267F] hover:text-[#00267F]"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </nav>
  );
}
