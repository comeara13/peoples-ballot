"use client";

import type { Pair, Selection } from "@/types/ballot";

interface PairCardProps {
  pair: Pair;
  index: number;
  selection: Selection | undefined;
  onSelect: (pairId: string, selection: Selection) => void;
}

export function PairCard({ pair, index, selection, onSelect }: PairCardProps) {
  return (
    <div className="py-6">
      <div className="text-xs text-gray-400 mb-3 font-medium">Question {index + 1}</div>
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        <button
          onClick={() => onSelect(pair.id, "left")}
          className={[
            "flex-1 rounded-lg border-2 p-4 text-center cursor-pointer transition-all duration-150 text-sm leading-relaxed text-left",
            selection === "left"
              ? "border-blue-500 bg-blue-50 text-blue-900 shadow-sm"
              : "border-gray-200 bg-white hover:border-gray-400 text-gray-700",
            selection && selection !== "left" ? "opacity-40" : "",
          ].join(" ")}
        >
          <div className="min-h-[64px] flex items-center">{pair.left.text}</div>
          <div className="mt-2 text-xs text-gray-400">ID: {pair.left.id}</div>
        </button>

        <div className="flex items-center justify-center sm:px-2 font-bold text-gray-400 text-sm">
          OR
        </div>

        <button
          onClick={() => onSelect(pair.id, "right")}
          className={[
            "flex-1 rounded-lg border-2 p-4 text-center cursor-pointer transition-all duration-150 text-sm leading-relaxed text-left",
            selection === "right"
              ? "border-blue-500 bg-blue-50 text-blue-900 shadow-sm"
              : "border-gray-200 bg-white hover:border-gray-400 text-gray-700",
            selection && selection !== "right" ? "opacity-40" : "",
          ].join(" ")}
        >
          <div className="min-h-[64px] flex items-center">{pair.right.text}</div>
          <div className="mt-2 text-xs text-gray-400">ID: {pair.right.id}</div>
        </button>
      </div>

      <div className="flex justify-center mt-3">
        <button
          onClick={() => onSelect(pair.id, "cant_decide")}
          className={[
            "text-sm px-4 py-1.5 rounded-full border transition-colors",
            selection === "cant_decide"
              ? "border-gray-400 bg-gray-100 text-gray-700 font-medium"
              : "border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300",
          ].join(" ")}
        >
          I can&apos;t decide
        </button>
      </div>
    </div>
  );
}
