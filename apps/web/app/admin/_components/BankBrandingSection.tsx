"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { BrandingField, MarkdownField } from "./BrandingFields";

export function BankBrandingSection({ bank }: { bank: { id: string; title: string | null; subtitle: string | null; headerImageUrl: string | null; questionHeading: string | null } }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(bank.title ?? "");
  const [subtitle, setSubtitle] = useState(bank.subtitle ?? "");
  const [headerImageUrl, setHeaderImageUrl] = useState(bank.headerImageUrl ?? "");
  const [questionHeading, setQuestionHeading] = useState(bank.questionHeading ?? "");
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = trpc.ideaBanks.update.useMutation({
    onSuccess: (data) => {
      utils.ideaBanks.getById.invalidate({ id: bank.id });
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
    title !== (bank.title ?? "") ||
    subtitle !== (bank.subtitle ?? "") ||
    headerImageUrl !== (bank.headerImageUrl ?? "") ||
    questionHeading !== (bank.questionHeading ?? "");

  function save() {
    update.mutate({
      id: bank.id,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      headerImageUrl: headerImageUrl.trim() || null,
      questionHeading: questionHeading.trim() || null,
    });
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white mb-6">
      <div className="space-y-3">
        <BrandingField
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Displayed on the landing page (defaults to bank name)"
        />
        <MarkdownField
          label="Subtitle"
          hint="Supports Markdown"
          value={subtitle}
          onChange={setSubtitle}
          placeholder="Optional tagline or description shown below the title"
        />
        <BrandingField
          label="Header Image URL"
          value={headerImageUrl}
          onChange={setHeaderImageUrl}
          placeholder="https://…"
        />
        <MarkdownField
          label="Ballot Question Heading"
          hint="Shown above the pairs on the ballot. Leave blank to hide. Supports Markdown."
          value={questionHeading}
          onChange={setQuestionHeading}
          placeholder="Which idea would best help…"
        />
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
      </div>
    </div>
  );
}
