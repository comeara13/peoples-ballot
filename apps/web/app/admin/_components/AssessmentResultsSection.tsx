"use client";

import { trpc } from "@/lib/trpc";

export function AssessmentResultsSection({
  ideaBankId,
  stage,
}: {
  ideaBankId: string;
  stage: "pre" | "post";
}) {
  const { data, isLoading } = trpc.assessment.resultsForBank.useQuery({ ideaBankId, stage });

  if (isLoading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (!data?.length) return <p className="text-sm text-gray-600">No results yet.</p>;

  return (
    <div>
      <div className="space-y-3">
        {data.map((q) => (
          <div key={q.id} className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
            <p className="text-sm text-gray-800 mb-1 leading-snug">{q.text}</p>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              {q.type === "likert" ? (
                <span>
                  Avg:{" "}
                  <span className="font-semibold text-gray-800">
                    {q.avgScore !== null ? q.avgScore.toFixed(1) : "—"} / 5
                  </span>
                </span>
              ) : (
                <span>
                  Yes:{" "}
                  <span className="font-semibold text-gray-800">
                    {q.responseCount > 0
                      ? `${Math.round(((q.yesCount ?? 0) / q.responseCount) * 100)}%`
                      : "—"}
                  </span>
                </span>
              )}
              <span className="text-gray-400">·</span>
              <span>
                {q.responseCount} {q.responseCount === 1 ? "response" : "responses"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
