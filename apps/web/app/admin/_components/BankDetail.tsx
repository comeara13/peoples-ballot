"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { CollapsibleSection } from "./CollapsibleSection";
import { BankBrandingSection } from "./BankBrandingSection";
import { PostVoteSection } from "./PostVoteSection";
import { IdeaCard, AddIdeaForm } from "./IdeaCard";
import { AffiliationGroupsSection } from "./AffiliationGroupsSection";
import { AssessmentQuestionsSection } from "./AssessmentQuestionsSection";
import { AssessmentResultsSection } from "./AssessmentResultsSection";
import { PartySection } from "./PartySection";
import { BankSuggestionsSection } from "./SuggestionsSection";
import { BankTestimonialsSection } from "./TestimonialsSection";

export function BankDetail({ bankId }: { bankId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.ideaBanks.getById.useQuery({ id: bankId });
  const { data: availableTags = [] } = trpc.tags.list.useQuery(undefined);
  const { data: availableGlossaryTerms = [] } = trpc.glossary.list.useQuery({ includeArchived: true });
  const [showAddForm, setShowAddForm] = useState(false);
  const [ideaMutationError, setIdeaMutationError] = useState<string | null>(null);

  const setIdeaTags = trpc.ideaBanks.setIdeaTags.useMutation({
    onSuccess: () => utils.ideaBanks.getById.invalidate({ id: bankId }),
    onError: (err) => setIdeaMutationError(err.message),
  });
  const setIdeaGlossaryTerms = trpc.glossary.setIdeaTerms.useMutation({
    onSuccess: () => utils.ideaBanks.getById.invalidate({ id: bankId }),
    onError: (err) => setIdeaMutationError(err.message),
  });
  const upsertTranslation = trpc.ideaBanks.upsertTranslation.useMutation({
    onSuccess: () => utils.ideaBanks.getById.invalidate({ id: bankId }),
  });

  if (isLoading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">Error: {error.message}</p>;
  if (!data) return <p className="text-sm text-gray-600">Bank not found.</p>;

  return (
    <div>
      <button
        onClick={() => router.push("/admin")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 group"
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to Banks
      </button>

      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{data.name}</h1>
          <p className="text-sm text-gray-600 mt-0.5">{data.ideas.length} ideas</p>
        </div>
      </div>

      <CollapsibleSection title="Campaign Branding" defaultOpen={false}>
        <BankBrandingSection key={data.id} bank={data} />
      </CollapsibleSection>

      <CollapsibleSection title="Post-Vote" defaultOpen={false}>
        <PostVoteSection key={`pv-${data.id}`} bank={data} />
      </CollapsibleSection>

      <CollapsibleSection title="Ideas" defaultOpen={true}>
        {!showAddForm && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
            >
              + Add Idea
            </button>
          </div>
        )}
        {ideaMutationError && (
          <p role="alert" className="text-xs text-red-600 mb-3">{ideaMutationError}</p>
        )}
        {showAddForm && (
          <AddIdeaForm
            bankId={bankId}
            onAdd={() => {
              setShowAddForm(false);
              utils.ideaBanks.getById.invalidate({ id: bankId });
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        <div className="space-y-3">
          {data.ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              availableTags={availableTags}
              onSetTags={(ideaId, tagIds) => setIdeaTags.mutate({ ideaId, tagIds })}
              availableGlossaryTerms={availableGlossaryTerms}
              onSetGlossaryTerms={(ideaId, termIds) =>
                setIdeaGlossaryTerms.mutate({ ideaId, termIds })
              }
              onUpsertTranslation={async (ideaId, language, text) => {
                await upsertTranslation.mutateAsync({ ideaId, language, text });
              }}
            />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Community & Political Groups" defaultOpen={false}>
        <AffiliationGroupsSection ideaBankId={bankId} />
      </CollapsibleSection>

      <CollapsibleSection title="Pre-Vote Questions" defaultOpen={false}>
        <AssessmentQuestionsSection ideaBankId={bankId} stage="pre" />
      </CollapsibleSection>

      <CollapsibleSection title="Post-Vote Questions" defaultOpen={false}>
        <AssessmentQuestionsSection ideaBankId={bankId} stage="post" />
      </CollapsibleSection>

      <CollapsibleSection title="Pre-Vote Results" defaultOpen={false}>
        <AssessmentResultsSection ideaBankId={bankId} stage="pre" />
      </CollapsibleSection>

      <CollapsibleSection title="Post-Vote Results" defaultOpen={false}>
        <AssessmentResultsSection ideaBankId={bankId} stage="post" />
      </CollapsibleSection>

      <CollapsibleSection title="Parties" defaultOpen={true}>
        <PartySection bankId={bankId} />
      </CollapsibleSection>

      <CollapsibleSection title="Suggested Ideas" defaultOpen={false}>
        <BankSuggestionsSection ideaBankId={bankId} />
      </CollapsibleSection>

      <CollapsibleSection title="Testimonials" defaultOpen={false}>
        <BankTestimonialsSection ideaBankId={bankId} />
      </CollapsibleSection>
    </div>
  );
}
