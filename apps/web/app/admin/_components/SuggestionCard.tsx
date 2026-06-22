"use client";

import { useState } from "react";
import { Command } from "cmdk";
import { trpc } from "@/lib/trpc";
import { SUGGESTION_STATUS_STYLES, TAG_TYPE_STYLES, type SuggestionRow } from "./shared";

export function SuggestionCard({ suggestion }: { suggestion: SuggestionRow }) {
  const [showLinkedIdeas, setShowLinkedIdeas] = useState(false);
  const [showIdeaPicker, setShowIdeaPicker] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: linkedIdeas, isLoading: linkedLoading } =
    trpc.suggestionLinks.listForSuggestion.useQuery(
      { suggestionId: suggestion.id },
      { enabled: showLinkedIdeas },
    );
  const { data: candidateIdeas } = trpc.suggestionLinks.candidateIdeas.useQuery(
    { suggestionId: suggestion.id },
    { enabled: showIdeaPicker },
  );

  const link = trpc.suggestionLinks.link.useMutation({
    onSuccess: () => {
      setLinkError(null);
      utils.suggestionLinks.listForSuggestion.invalidate({ suggestionId: suggestion.id });
      utils.suggestionLinks.candidateIdeas.invalidate({ suggestionId: suggestion.id });
      utils.suggestedIdeas.invalidate();
      setShowIdeaPicker(false);
    },
    onError: (err) => setLinkError(err.message),
  });

  const unlink = trpc.suggestionLinks.unlink.useMutation({
    onSuccess: () => {
      setLinkError(null);
      utils.suggestionLinks.listForSuggestion.invalidate({ suggestionId: suggestion.id });
      utils.suggestionLinks.candidateIdeas.invalidate({ suggestionId: suggestion.id });
      utils.suggestedIdeas.invalidate();
    },
    onError: (err) => setLinkError(err.message),
  });

  const isLinked = suggestion.linkedIdeaCount > 0;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${SUGGESTION_STATUS_STYLES[suggestion.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            {suggestion.status}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLinked ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
          >
            {isLinked ? `linked (${suggestion.linkedIdeaCount})` : "unlinked"}
          </span>
          {suggestion.partyName && (
            <span className="text-xs text-gray-500 font-medium">{suggestion.partyName}</span>
          )}
          {suggestion.tags.map((tag) => (
            <span
              key={tag.id}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${TAG_TYPE_STYLES[tag.type] ?? "bg-gray-100 text-gray-600"}`}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-500 shrink-0 font-mono">
          {new Date(suggestion.createdAt).toLocaleDateString()}
        </span>
      </div>

      <p className="text-sm text-gray-800 leading-snug">{suggestion.text}</p>

      {(suggestion.voterFirstName || suggestion.voterLastName) && (
        <p className="text-xs text-gray-500">
          Submitted by {suggestion.voterFirstName} {suggestion.voterLastName}
        </p>
      )}

      <div className="pt-1 border-t border-gray-100">
        <button
          onClick={() => setShowLinkedIdeas((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium"
        >
          <span>{showLinkedIdeas ? "▾" : "▸"}</span> Linked Ideas
          {suggestion.linkedIdeaCount > 0 && (
            <span className="text-gray-500">({suggestion.linkedIdeaCount})</span>
          )}
        </button>

        {showLinkedIdeas && (
          <div className="mt-2 space-y-1">
            {linkedLoading && <p className="text-xs text-gray-500">Loading…</p>}
            {linkError && <p className="text-xs text-red-600">{linkError}</p>}
            {linkedIdeas?.map((idea) => (
              <div key={idea.id} className="flex items-start gap-2 py-1 border-t border-gray-50 text-xs">
                <span className="flex-1 text-gray-700 leading-snug">
                  {idea.enText ?? <span className="italic text-gray-500">No English text</span>}
                </span>
                <button
                  onClick={() => unlink.mutate({ suggestionId: suggestion.id, ideaId: idea.id })}
                  disabled={unlink.isPending}
                  className="text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50"
                >
                  Unlink
                </button>
              </div>
            ))}
            {!linkedLoading && linkedIdeas?.length === 0 && (
              <p className="text-xs text-gray-500 py-1">No ideas linked yet.</p>
            )}

            <div className="relative mt-2">
              <button
                onClick={() => setShowIdeaPicker((v) => !v)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Link idea
              </button>
              {showIdeaPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowIdeaPicker(false)} />
                  <div className="absolute top-full left-0 mt-1 z-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <Command>
                      <Command.Input
                        autoFocus
                        placeholder="Search ideas…"
                        className="w-full px-3 py-2 text-sm border-b border-gray-200 outline-none text-gray-800 placeholder:text-gray-400"
                      />
                      <Command.List className="max-h-52 overflow-y-auto py-1">
                        <Command.Empty className="px-3 py-3 text-xs text-gray-500 text-center">
                          No ideas found.
                        </Command.Empty>
                        {candidateIdeas?.map((idea) => (
                          <Command.Item
                            key={idea.id}
                            value={idea.enText ?? idea.id}
                            onSelect={() =>
                              link.mutate({ suggestionId: suggestion.id, ideaId: idea.id })
                            }
                            className="px-3 py-2 text-xs text-gray-700 cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-800 hover:bg-gray-50"
                          >
                            <span className="line-clamp-2 leading-snug">
                              {idea.enText ?? <span className="italic text-gray-500">No English text</span>}
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
    </div>
  );
}
