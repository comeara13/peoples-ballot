"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { BrandingField, MarkdownField } from "./BrandingFields";

export function PartyBrandingSection({
  party,
  bankId,
  isClosed,
}: {
  party: { id: string; title: string | null; subtitle: string | null; headerImageUrl: string | null; questionHeading: string | null };
  bankId: string;
  isClosed: boolean;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(party.title ?? "");
  const [subtitle, setSubtitle] = useState(party.subtitle ?? "");
  const [headerImageUrl, setHeaderImageUrl] = useState(party.headerImageUrl ?? "");
  const [questionHeading, setQuestionHeading] = useState(party.questionHeading ?? "");
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  // Sync state when remote data changes — "adjust during render" pattern.
  const [prevParty, setPrevParty] = useState(party);
  if (party !== prevParty) {
    setPrevParty(party);
    setTitle(party.title ?? "");
    setSubtitle(party.subtitle ?? "");
    setHeaderImageUrl(party.headerImageUrl ?? "");
    setQuestionHeading(party.questionHeading ?? "");
  }

  const update = trpc.parties.update.useMutation({
    onSuccess: (data) => {
      utils.parties.listByBank.invalidate({ ideaBankId: bankId });
      setTitle(data.title ?? "");
      setSubtitle(data.subtitle ?? "");
      setHeaderImageUrl(data.headerImageUrl ?? "");
      setQuestionHeading(data.questionHeading ?? "");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      setShowSaved(true);
      savedTimer.current = setTimeout(() => setShowSaved(false), 2500);
    },
  });

  const dirty =
    title !== (party.title ?? "") ||
    subtitle !== (party.subtitle ?? "") ||
    headerImageUrl !== (party.headerImageUrl ?? "") ||
    questionHeading !== (party.questionHeading ?? "");

  function save() {
    update.mutate({
      id: party.id,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      headerImageUrl: headerImageUrl.trim() || null,
      questionHeading: questionHeading.trim() || null,
    });
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white mb-6">
      <p className="text-xs text-gray-500 mb-3">Leave blank to inherit from the campaign.</p>
      <div className="space-y-3">
        <BrandingField
          label="Title"
          value={title}
          onChange={setTitle}
          onClear={isClosed ? undefined : () => setTitle("")}
          placeholder="Override campaign title…"
          disabled={isClosed}
        />
        <MarkdownField
          label="Subtitle"
          hint="Supports Markdown"
          value={subtitle}
          onChange={setSubtitle}
          placeholder="Override campaign subtitle…"
          disabled={isClosed}
        />
        <BrandingField
          label="Header Image URL"
          value={headerImageUrl}
          onChange={setHeaderImageUrl}
          onClear={isClosed ? undefined : () => setHeaderImageUrl("")}
          placeholder="https://…"
          disabled={isClosed}
        />
        <MarkdownField
          label="Ballot Question Heading"
          hint="Overrides the campaign heading shown above the pairs. Leave blank to inherit. Supports Markdown."
          value={questionHeading}
          onChange={setQuestionHeading}
          placeholder="Override ballot question heading…"
          disabled={isClosed}
        />
        {!isClosed && (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={save}
              disabled={!dirty || update.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40 font-medium"
            >
              {update.isPending ? "Saving…" : "Save Branding"}
            </button>
            <span role="status" aria-live="polite" className="text-xs text-green-600">
              {showSaved ? "Saved" : ""}
            </span>
            {update.error && (
              <span role="alert" className="text-xs text-red-600">{update.error.message}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
