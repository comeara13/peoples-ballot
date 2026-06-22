"use client";

import { trpc } from "@/lib/trpc";
import { SuggestionCard } from "./SuggestionCard";
import type { SuggestionRow } from "./shared";

export function SuggestionsSection({ data, isLoading }: { data: SuggestionRow[] | undefined; isLoading: boolean }) {
  return (
    <div>
      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && !data?.length && (
        <p className="text-sm text-gray-600">No suggestions yet.</p>
      )}

      {!isLoading && !!data?.length && (
        <p className="text-xs text-gray-500 mb-3">{data.length} {data.length === 1 ? "suggestion" : "suggestions"}</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PartySuggestionsSection({ partyId }: { partyId: string }) {
  const { data, isLoading } = trpc.suggestedIdeas.listByParty.useQuery({ partyId });
  return <SuggestionsSection data={data} isLoading={isLoading} />;
}

export function BankSuggestionsSection({ ideaBankId }: { ideaBankId: string }) {
  const { data, isLoading } = trpc.suggestedIdeas.listByBank.useQuery({ ideaBankId });
  return <SuggestionsSection data={data} isLoading={isLoading} />;
}
