"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function AssessmentQuestionsSection({
  ideaBankId,
  stage,
}: {
  ideaBankId: string;
  stage: "pre" | "post";
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.assessment.listQuestionsForBank.useQuery({ ideaBankId, stage });
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<"likert" | "yes_no">("likert");
  const [addError, setAddError] = useState<string | null>(null);

  const createMutation = trpc.assessment.createQuestion.useMutation({
    onSuccess: () => {
      setNewText("");
      setAddError(null);
      utils.assessment.listQuestionsForBank.invalidate({ ideaBankId, stage });
      utils.assessment.resultsForBank.invalidate({ ideaBankId, stage });
    },
    onError: (err) => setAddError(err.message),
  });

  const deleteMutation = trpc.assessment.deleteQuestion.useMutation({
    onSuccess: () => {
      utils.assessment.listQuestionsForBank.invalidate({ ideaBankId, stage });
      utils.assessment.resultsForBank.invalidate({ ideaBankId, stage });
    },
  });

  const hint =
    stage === "pre"
      ? "Shown on the voter registration form before voting."
      : "Shown after ballot submission.";

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">{hint}</p>

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-gray-500 mb-3">No questions yet. Add one below.</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.map((q) => (
            <div
              key={q.id}
              className="flex items-start justify-between border border-gray-200 rounded-lg px-4 py-3 bg-white gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{q.text}</p>
                <span className="inline-block mt-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {q.type === "likert" ? "Likert 1–5" : "Yes / No"}
                </span>
              </div>
              <button
                onClick={() => deleteMutation.mutate({ id: q.id })}
                disabled={deleteMutation.isPending}
                aria-label={`Delete question: ${q.text}`}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
                title="Deletes all existing responses for this question"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newText.trim())
            createMutation.mutate({ ideaBankId, text: newText.trim(), type: newType, stage });
        }}
        className="space-y-2"
      >
        <textarea
          value={newText}
          onChange={(e) => {
            setNewText(e.target.value);
            setAddError(null);
          }}
          placeholder="Question text (e.g. I believe my government listens to me)"
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "likert" | "yes_no")}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="likert">Likert 1–5</option>
            <option value="yes_no">Yes / No</option>
          </select>
          <button
            type="submit"
            disabled={!newText.trim() || createMutation.isPending}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Add
          </button>
        </div>
      </form>
      {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
    </div>
  );
}
