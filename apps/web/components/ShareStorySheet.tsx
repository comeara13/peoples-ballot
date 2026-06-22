"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

interface ShareStorySheetProps {
  ballotId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareStorySheet({ ballotId, open, onClose }: ShareStorySheetProps) {
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [text, setText] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  const submit = trpc.testimonials.submit.useMutation({
    onSuccess: () => setPhase("success"),
  });

  function handleSubmit() {
    if (!text.trim()) return;
    submit.mutate({ ballotId, text: text.trim() });
  }

  function resetForm() {
    setText("");
    submit.reset();
    setPhase("form");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, textarea, input, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        resetForm();
        onClose();
        return;
      }
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetForm is stable; phase re-runs the effect to refresh focusable after form→success transition
  }, [open, phase, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden="true"
        onClick={handleClose}
      />

      <div
        role="dialog"
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="share-story-title"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-10 pt-2">
          {phase === "form" ? (
            <div className="space-y-6">
              <div>
                <h2 id="share-story-title" className="text-lg font-semibold text-gray-900">Share Your Story</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Why does this issue matter to you? Responses will be anonymized and shared in
                  aggregate with policymakers.
                </p>
              </div>

              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Share your perspective…"
                  maxLength={5000}
                  rows={6}
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{text.length} / 5000</p>
              </div>

              {submit.error && <p role="alert" className="text-xs text-red-600">{submit.error.message}</p>}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || submit.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {submit.isPending ? "Submitting…" : "Submit Story"}
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
                  <h2 className="text-lg font-semibold text-gray-900">Story Shared</h2>
                </div>
                <p className="text-sm text-gray-600">
                  Thank you for sharing your perspective. Your story has been submitted.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                Return to Ballot
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
