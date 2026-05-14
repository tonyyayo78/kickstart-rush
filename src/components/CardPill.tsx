type CardType = "yellow" | "red" | "second_yellow";

const STYLES: Record<CardType, string> = {
  yellow: "bg-yellow-400 text-yellow-900",
  red: "bg-red-600 text-white",
  second_yellow: "bg-orange-400 text-orange-900",
};

const LABELS: Record<CardType, string> = {
  yellow: "Y",
  red: "R",
  second_yellow: "2Y",
};

export default function CardPill({ cardType }: { cardType: string }) {
  const type = cardType as CardType;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold uppercase leading-none ${STYLES[type] ?? "bg-zinc-300 text-zinc-700"}`}
    >
      {LABELS[type] ?? cardType}
    </span>
  );
}
