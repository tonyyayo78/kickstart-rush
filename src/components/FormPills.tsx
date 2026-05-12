const PILL_CLS: Record<string, string> = {
  W: "bg-green-600 text-white",
  D: "bg-zinc-300 text-zinc-700",
  L: "bg-red-500 text-white",
};

export default function FormPills({ form }: { form: string[] }) {
  if (!form.length) return <span className="text-xs text-zinc-300">—</span>;

  return (
    <span className="flex items-center gap-0.5">
      {form.map((result, i) => (
        <span
          key={i}
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${PILL_CLS[result] ?? "bg-zinc-200 text-zinc-500"}`}
          aria-label={result === "W" ? "Win" : result === "D" ? "Draw" : "Loss"}
        >
          {result}
        </span>
      ))}
    </span>
  );
}
