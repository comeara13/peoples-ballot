"use client";

import { useState } from "react";
import type { Pair, Selection, BallotState } from "@/types/ballot";
import { PairCard } from "./PairCard";

interface BallotProps {
  pairs: Pair[];
  question: string;
}

export function Ballot({ pairs, question }: BallotProps) {
  const [state, setState] = useState<BallotState>({});

  const answered = Object.keys(state).length;
  const total = pairs.length;
  const remaining = total - answered;

  function handleSelect(pairId: string, selection: Selection) {
    setState((prev) => ({ ...prev, [pairId]: selection }));
  }

  function handleSubmit() {
    console.log("Ballot submitted:", state);
    // TODO: send to backend
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 px-4 py-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold text-gray-900 leading-snug text-center underline">
            {question}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {pairs.map((pair, index) => (
          <div key={pair.id}>
            <PairCard
              pair={pair}
              index={index}
              selection={state[pair.id]}
              onSelect={handleSelect}
            />
            {index < pairs.length - 1 && <div className="border-t border-dashed border-gray-300" />}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{answered}</span>
            {" / "}
            {total} answered
            {remaining > 0 && (
              <span className="ml-2 text-amber-600 text-xs">({remaining} remaining)</span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            Submit Ballot
          </button>
        </div>
      </div>
    </div>
  );
}
