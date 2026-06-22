"use client";

import { useState } from "react";
import { Command } from "cmdk";
import { trpc } from "@/lib/trpc";
import { SUGGESTION_STATUS_STYLES } from "./shared";

export function LinkedSuggestionsPanel({ ideaId }: { ideaId: string }) {
  const [show, setShow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: linked, isLoading } = trpc.suggestionLinks.listForIdea.useQuery(
    { ideaId },
    { enabled: show },
  );
  const { data: candidates } = trpc.suggestionLinks.candidateSuggestions.useQuery(
    { ideaId },
    { enabled: showPicker },
  );

  const link = trpc.suggestionLinks.link.useMutation({
    onSuccess: () => {
      setError(null);
      utils.suggestionLinks.listForIdea.invalidate({ ideaId });
      utils.suggestionLinks.candidateSuggestions.invalidate({ ideaId });
      utils.suggestedIdeas.invalidate();
      setShowPicker(false);
    },
    onError: (err) => setError(err.message),
  });
  const unlink = trpc.suggestionLinks.unlink.useMutation({
    onSuccess: () => {
      setError(null);
      utils.suggestionLinks.listForIdea.invalidate({ ideaId });
      utils.suggestionLinks.candidateSuggestions.invalidate({ ideaId });
      utils.suggestedIdeas.invalidate();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={() => setShow((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium"
      >
        <span>{show ? "▾" : "▸"}</span> Linked Suggestions
        {linked && linked.length > 0 && (
          <span className="text-gray-500">({linked.length})</span>
        )}
      </button>

      {show && (
        <div className="mt-2 space-y-1">
          {isLoading && <p className="text-xs text-gray-500">Loading…</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {linked?.map((s) => (
            <div key={s.id} className="flex items-start gap-2 py-1 border-t border-gray-50 text-xs">
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded-full font-medium ${SUGGESTION_STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}
              >
                {s.status}
              </span>
              <span className="flex-1 text-gray-700 leading-snug line-clamp-2">{s.text}</span>
              <button
                onClick={() => unlink.mutate({ suggestionId: s.id, ideaId })}
                disabled={unlink.isPending}
                className="text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50"
              >
                Unlink
              </button>
            </div>
          ))}
          {!isLoading && linked?.length === 0 && (
            <p className="text-xs text-gray-500 py-1">No suggestions linked yet.</p>
          )}

          <div className="relative mt-2">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              + Link suggestion
            </button>
            {showPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} aria-hidden />
                <div className="absolute top-full left-0 mt-1 z-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  <Command>
                    <Command.Input
                      autoFocus
                      placeholder="Search suggestions…"
                      className="w-full px-3 py-2 text-sm border-b border-gray-200 outline-none text-gray-800 placeholder:text-gray-400"
                    />
                    <Command.List className="max-h-52 overflow-y-auto py-1">
                      <Command.Empty className="px-3 py-3 text-xs text-gray-500 text-center">
                        No suggestions found.
                      </Command.Empty>
                      {candidates?.map((s) => (
                        <Command.Item
                          key={s.id}
                          value={s.text}
                          onSelect={() => link.mutate({ suggestionId: s.id, ideaId })}
                          className="px-3 py-2 text-xs cursor-pointer aria-selected:bg-blue-50 hover:bg-gray-50"
                        >
                          <p className="line-clamp-2 leading-snug text-gray-700">{s.text}</p>
                          <span
                            className={`mt-0.5 inline-block px-1.5 rounded-full text-[10px] font-medium ${SUGGESTION_STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {s.status}
                          </span>
                        </Command.Item>
                      ))}
                    </Command.List>
                  </Command>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
