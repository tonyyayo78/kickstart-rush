"use client";

export type SquadOption = {
  id: string;
  code: string;
  name: string;
};

export type SquadsCheckboxGridProps = {
  allSquads: SquadOption[];
  selectedIds: string[];
  /** Form field name used for each checkbox. Multi-value via formData.getAll(name). */
  name: string;
  /** Optional disabled state, e.g. during pending action submission. */
  disabled?: boolean;
};

export default function SquadsCheckboxGrid({
  allSquads,
  selectedIds,
  name,
  disabled,
}: SquadsCheckboxGridProps) {
  const selected = new Set(selectedIds);

  return (
    <fieldset
      disabled={disabled}
      className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3"
    >
      {allSquads.map((s) => {
        const isChecked = selected.has(s.id);
        return (
          <label
            key={s.id}
            className="flex items-center gap-2 text-xs font-medium text-zinc-700"
          >
            <input
              type="checkbox"
              name={name}
              value={s.id}
              defaultChecked={isChecked}
              className="h-4 w-4 rounded border-zinc-300 text-[#00267F] focus:ring-[#00267F]"
            />
            <span className="truncate">
              <span className="font-mono text-[10px] uppercase text-zinc-400">
                {s.code}
              </span>{" "}
              {s.name}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
