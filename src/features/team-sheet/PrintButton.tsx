"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-[#00267F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3349A3] transition-colors"
    >
      Print team sheet
    </button>
  );
}
