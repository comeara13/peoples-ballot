"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-amber-100 text-amber-700",
  submitted: "bg-green-100 text-green-700",
};

function PairRow({
  pair,
}: {
  pair: {
    id: string;
    position: number;
    leftText: string;
    rightText: string;
    vote: { selection: string } | null;
  };
}) {
  const { selection } = pair.vote ?? {};

  return (
    <div className="flex items-start gap-3 py-2 border-t border-gray-100 text-sm">
      <span className="text-gray-500 font-mono text-xs w-5 shrink-0 mt-0.5">{pair.position}.</span>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p
          className={`truncate leading-snug ${
            selection === "left"
              ? "font-semibold text-blue-700"
              : selection === "right"
                ? "text-gray-400 line-through"
                : "text-gray-700"
          }`}
        >
          {pair.leftText}
        </p>
        <p
          className={`truncate leading-snug ${
            selection === "right"
              ? "font-semibold text-blue-700"
              : selection === "left"
                ? "text-gray-400 line-through"
                : "text-gray-600"
          }`}
        >
          {pair.rightText}
        </p>
      </div>
      <span
        className={`text-xs shrink-0 font-medium mt-0.5 ${
          selection === "cant_decide"
            ? "text-gray-500"
            : selection
              ? "text-blue-600"
              : "text-gray-400"
        }`}
      >
        {selection === "left"
          ? "← left"
          : selection === "right"
            ? "right →"
            : selection === "cant_decide"
              ? "can't decide"
              : "—"}
      </span>
    </div>
  );
}

function CopyLinkButton({ accessCode }: { accessCode: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function scheduleReset() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      title="Copy ballot link"
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}/?ballotId=${encodeURIComponent(accessCode)}`)
          .then(() => { setState("copied"); scheduleReset(); })
          .catch(() => { setState("error"); scheduleReset(); });
      }}
      className="shrink-0 flex items-center gap-1 px-3 py-3 text-xs text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors border-l border-gray-200"
    >
      {state === "copied" ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-green-600"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
          <span className="text-green-600">Copied</span>
        </>
      ) : state === "error" ? (
        <span className="text-red-500">Failed</span>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M7.628 1.099a.75.75 0 0 1 .744 0l1.247.713A3.75 3.75 0 0 0 11.5 2.25h.5a1.5 1.5 0 0 1 1.5 1.5v1a3.75 3.75 0 0 0 .399 1.686l.612 1.224a.75.75 0 0 1-.668 1.09H13.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2.5 13.25v-4.5H1.657a.75.75 0 0 1-.668-1.09l.612-1.224A3.75 3.75 0 0 0 2 4.75v-1A1.5 1.5 0 0 1 3.5 2.25H4a3.75 3.75 0 0 0 1.881-.438L7.128 1.1ZM6 6.5a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H6ZM6 9.25a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H6Z" /></svg>
          <span>Share</span>
        </>
      )}
    </button>
  );
}

export function BallotCard({
  ballot,
  expanded,
  onToggle,
}: {
  ballot: {
    id: string;
    status: string;
    accessCode: string | null;
    createdAt: Date | string;
    pairCount: number;
    voteCount: number;
  };
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data, isLoading } = trpc.ballots.getById.useQuery(
    { id: ballot.id },
    { enabled: expanded },
  );

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center">
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors min-w-0"
        >
          <span className="font-mono text-xs text-gray-500 shrink-0 select-all">{ballot.id}</span>
          {ballot.accessCode && (
            <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 shrink-0 select-all">
              {ballot.accessCode}
            </span>
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[ballot.status] ?? STATUS_STYLES.pending}`}
          >
            {ballot.status}
          </span>
          <span className="text-sm text-gray-700 shrink-0">
            {ballot.voteCount}/{ballot.pairCount} votes
          </span>
          <span className="text-xs text-gray-600 font-mono shrink-0">
            {new Date(ballot.createdAt).toLocaleString()}
          </span>
          <span className="ml-auto text-gray-400 text-xs shrink-0">{expanded ? "▲" : "▼"}</span>
        </button>
        {ballot.accessCode && (
          <CopyLinkButton accessCode={ballot.accessCode} />
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-3">
          {isLoading ? (
            <p className="text-sm text-gray-600 py-3">Loading…</p>
          ) : data?.pairs.length ? (
            data.pairs.map((pair) => <PairRow key={pair.id} pair={pair} />)
          ) : (
            <p className="text-sm text-gray-600 py-3">No pairs found.</p>
          )}
        </div>
      )}
    </div>
  );
}
