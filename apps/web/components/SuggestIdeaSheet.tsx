"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

interface SuggestIdeaSheetProps {
  ballotId: string;
  open: boolean;
  onClose: () => void;
}

export function SuggestIdeaSheet({ ballotId, open, onClose }: SuggestIdeaSheetProps) {
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [text, setText] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const { data: tags = [] } = trpc.tags.list.useQuery(undefined, { enabled: open });
  const issueCategories = tags.filter((t) => t.type === "issue_category");
  const scaleTags = tags.filter((t) => t.type === "scale");

  const submit = trpc.suggestedIdeas.submit.useMutation({
    onSuccess: () => setPhase("success"),
  });

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  }

  function handleSubmit() {
    if (!text.trim()) return;
    submit.mutate({
      ballotId,
      text: text.trim(),
      tagIds: selectedTagIds,
    });
  }

  function resetForm() {
    setText("");
    setSelectedTagIds([]);
    submit.reset();
    setPhase("form");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resetForm();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetForm is stable; React Compiler handles memoization
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
                <p className="text-xs text-gray-500 mt-1 text-right">{text.length} / 2000</p>
              </div>

              {/* Tag pickers */}
              {(issueCategories.length > 0 || scaleTags.length > 0) && (
                <div className="space-y-4">
                  {issueCategories.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">Issue Category</h3>
                      <p className="text-xs text-gray-500 mb-3">Optional — select all that apply.</p>
                      <div className="flex flex-wrap gap-2">
                        {issueCategories.map((tag) => {
                          const selected = selectedTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                selected
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                              }`}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {scaleTags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">
                        Level of Government
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">Optional — select all that apply.</p>
                      <div className="flex flex-wrap gap-2">
                        {scaleTags.map((tag) => {
                          const selected = selectedTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                selected
                                  ? "bg-teal-600 text-white border-teal-600"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
                              }`}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Review note */}
              <p className="text-xs text-gray-500 leading-relaxed">
                Once you submit your idea, the review committee will approve and translate the
                submission within 48 hours. In instances that ideas are duplicative or similar,
                ideas will be merged.
              </p>

              {submit.error && <p className="text-xs text-red-600">{submit.error.message}</p>}

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
                  Your idea has been submitted for review. The committee will approve and translate
                  it within 48 hours.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetForm}
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
