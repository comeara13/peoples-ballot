"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const SPECIFIC_LEVELS = ["school_board", "city_town", "county", "state", "federal"] as const;

const LEVEL_LABELS: Record<string, string> = {
  school_board: "School Board",
  city_town: "City / Town",
  county: "County",
  state: "State",
  federal: "Federal",
  all: "All",
  any: "Any",
};

type GovernmentLevel =
  | "school_board"
  | "city_town"
  | "county"
  | "state"
  | "federal"
  | "all"
  | "any";

const ALL_LEVELS: GovernmentLevel[] = [
  "school_board",
  "city_town",
  "county",
  "state",
  "federal",
  "all",
  "any",
];

function toggleLevel(current: GovernmentLevel[], level: GovernmentLevel): GovernmentLevel[] {
  const isSelected = current.includes(level);

  if (level === "all") {
    // Selecting "all" clears all specific levels; deselecting removes "all"
    return isSelected ? current.filter((l) => l !== "all") : ["all"];
  }

  if (SPECIFIC_LEVELS.includes(level as (typeof SPECIFIC_LEVELS)[number])) {
    // Selecting a specific level removes "all"
    if (isSelected) {
      return current.filter((l) => l !== level);
    }
    return [...current.filter((l) => l !== "all"), level];
  }

  // "any" — plain toggle, no auto-clear
  return isSelected ? current.filter((l) => l !== level) : [...current, level];
}

interface SuggestIdeaSheetProps {
  ballotId: string;
  open: boolean;
  onClose: () => void;
}

export function SuggestIdeaSheet({ ballotId, open, onClose }: SuggestIdeaSheetProps) {
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [text, setText] = useState("");
  const [levels, setLevels] = useState<GovernmentLevel[]>([]);
  const [testimonial, setTestimonial] = useState("");

  const submit = trpc.suggestedIdeas.submit.useMutation({
    onSuccess: () => setPhase("success"),
  });

  function handleSubmit() {
    if (!text.trim()) return;
    submit.mutate({
      ballotId,
      text: text.trim(),
      governmentLevels: levels,
      testimonial: testimonial.trim() || undefined,
    });
  }

  function handleSubmitAnother() {
    resetForm();
  }

  function resetForm() {
    setText("");
    setLevels([]);
    setTestimonial("");
    submit.reset();
    setPhase("form");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { resetForm(); onClose(); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Submit your own idea"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-10 pt-2">
          {phase === "form" ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Submit Your Own Idea</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Please submit your idea here! Remember to submit only 1 idea at a time.
                </p>
              </div>

              {/* Idea text */}
              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Your idea…"
                  maxLength={2000}
                  rows={4}
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {text.length} / 2000
                </p>
              </div>

              {/* Government levels */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  Is there a specific level of government you are directing this idea to?
                </h3>
                <p className="text-xs text-gray-500 mb-3">Optional — select all that apply.</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {ALL_LEVELS.map((level) => (
                    <label key={level} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={levels.includes(level)}
                        onChange={() => setLevels(toggleLevel(levels, level))}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{LEVEL_LABELS[level]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Testimonial{" "}
                  <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Why did you submit this idea? What is something you would want to share about
                  why this idea matters to you? Responses will be anonymized.
                </p>
                <textarea
                  value={testimonial}
                  onChange={(e) => setTestimonial(e.target.value)}
                  placeholder="Share your perspective…"
                  maxLength={5000}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {testimonial.length} / 5000
                </p>
              </div>

              {/* Review note */}
              <p className="text-xs text-gray-500 leading-relaxed">
                Once you submit your idea, the review committee will approve and translate the
                submission within 48 hours. In instances that ideas are duplicative or similar,
                ideas will be merged.
              </p>

              {submit.error && (
                <p className="text-xs text-red-600">{submit.error.message}</p>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || submit.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {submit.isPending ? "Submitting…" : "Submit Idea"}
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Return to Ballot
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 text-xl">✓</span>
                  <h2 className="text-lg font-semibold text-gray-900">Idea Submitted</h2>
                </div>
                <p className="text-sm text-gray-600">
                  Your idea has been submitted for review. The committee will approve and
                  translate it within 48 hours.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubmitAnother}
                  className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Submit Another Idea
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Return to Ballot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
