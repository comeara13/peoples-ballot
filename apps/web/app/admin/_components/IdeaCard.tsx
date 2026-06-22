"use client";

import { useState } from "react";
import { Command } from "cmdk";
import { trpc } from "@/lib/trpc";
import {
  LANGUAGES,
  TAG_TYPE_STYLES,
  SUGGESTION_STATUS_STYLES,
  type Language,
  type Translation,
  type Idea,
  type Tag,
  type GlossaryTerm,
} from "./shared";

function TranslationRow({ translation, onEdit }: { translation: Translation; onEdit: () => void }) {
  return (
    <div className="flex items-start gap-3 py-1.5 text-sm border-t border-gray-200">
      <span className="w-8 font-mono text-xs text-gray-600 uppercase mt-0.5 shrink-0">
        {translation.language}
      </span>
      <span className="flex-1 text-gray-700 leading-snug line-clamp-2">{translation.text}</span>
      <button
        onClick={onEdit}
        className="text-blue-600 hover:text-blue-800 text-xs font-medium shrink-0"
      >
        Edit
      </button>
    </div>
  );
}

function EditTranslationForm({
  translation,
  onSave,
  onCancel,
}: {
  translation: Translation;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(translation.text);

  return (
    <div className="py-2 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-xs text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
          {translation.language}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-blue-500 resize-none"
        autoFocus
      />
      <div className="flex gap-2 mt-1.5">
        <button
          onClick={() => text.trim() && onSave(text.trim())}
          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-gray-600 text-xs rounded border border-gray-300 hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddTranslationForm({
  existingLanguages,
  onSave,
  onCancel,
}: {
  existingLanguages: string[];
  onSave: (language: string, text: string) => void;
  onCancel: () => void;
}) {
  const available = LANGUAGES.filter((l) => !existingLanguages.includes(l));
  const [language, setLanguage] = useState(available[0] ?? "en");
  const [text, setText] = useState("");

  if (!available.length) return null;

  return (
    <div className="py-2 border-t border-gray-100 mt-1">
      <div className="flex items-center gap-2 mb-1.5">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500"
        >
          {available.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-600">new translation</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Translation text…"
        rows={3}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        autoFocus
      />
      <div className="flex gap-2 mt-1.5">
        <button
          onClick={() => text.trim() && onSave(language, text.trim())}
          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-gray-600 text-xs rounded border border-gray-300 hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function IdeaCard({
  idea,
  availableTags,
  onSetTags,
  availableGlossaryTerms,
  onSetGlossaryTerms,
  onUpsertTranslation,
}: {
  idea: Idea;
  availableTags: Tag[];
  onSetTags: (ideaId: string, tagIds: string[]) => void;
  availableGlossaryTerms: GlossaryTerm[];
  onSetGlossaryTerms: (ideaId: string, termIds: string[]) => void;
  onUpsertTranslation: (ideaId: string, language: string, text: string) => void;
}) {
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [addingTranslation, setAddingTranslation] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showGlossaryPicker, setShowGlossaryPicker] = useState(false);
  const [showLinkedSuggestions, setShowLinkedSuggestions] = useState(false);
  const [showSuggestionPicker, setShowSuggestionPicker] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: linkedSuggestions, isLoading: linkedLoading } =
    trpc.suggestionLinks.listForIdea.useQuery(
      { ideaId: idea.id },
      { enabled: showLinkedSuggestions },
    );
  const { data: candidateSuggestions } = trpc.suggestionLinks.candidateSuggestions.useQuery(
    { ideaId: idea.id },
    { enabled: showSuggestionPicker },
  );
  const linkSuggestion = trpc.suggestionLinks.link.useMutation({
    onSuccess: () => {
      setLinkError(null);
      utils.suggestionLinks.listForIdea.invalidate({ ideaId: idea.id });
      utils.suggestionLinks.candidateSuggestions.invalidate({ ideaId: idea.id });
      utils.suggestedIdeas.invalidate();
      setShowSuggestionPicker(false);
    },
    onError: (err) => setLinkError(err.message),
  });
  const unlinkSuggestion = trpc.suggestionLinks.unlink.useMutation({
    onSuccess: () => {
      setLinkError(null);
      utils.suggestionLinks.listForIdea.invalidate({ ideaId: idea.id });
      utils.suggestionLinks.candidateSuggestions.invalidate({ ideaId: idea.id });
      utils.suggestedIdeas.invalidate();
    },
    onError: (err) => setLinkError(err.message),
  });

  const currentTagIds = new Set(idea.tags.map((t) => t.id));
  const unpickedTags = availableTags.filter((t) => !currentTagIds.has(t.id) && !t.archivedAt);

  function removeTag(tagId: string) {
    onSetTags(idea.id, idea.tags.filter((t) => t.id !== tagId).map((t) => t.id));
  }

  function addTag(tagId: string) {
    onSetTags(idea.id, [...idea.tags.map((t) => t.id), tagId]);
    setShowTagPicker(false);
  }

  const currentTermIds = new Set(idea.glossaryTerms.map((t) => t.id));
  const unpickedGlossaryTerms = availableGlossaryTerms.filter(
    (t) => !currentTermIds.has(t.id) && !t.archivedAt,
  );

  function removeTerm(termId: string) {
    onSetGlossaryTerms(
      idea.id,
      idea.glossaryTerms.filter((t) => t.id !== termId).map((t) => t.id),
    );
  }

  function addTerm(termId: string) {
    onSetGlossaryTerms(idea.id, [...idea.glossaryTerms.map((t) => t.id), termId]);
    setShowGlossaryPicker(false);
  }

  const existingLanguages = idea.translations.map((t) => t.language);
  const hasAllLanguages = LANGUAGES.every((l) => existingLanguages.includes(l));

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-xs text-gray-500 shrink-0 select-all">
          {idea.id.slice(0, 8)}
        </span>
        <div className="shrink-0 flex flex-col items-end gap-1 ml-auto">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${idea.score}%` }}
              />
            </div>
            <span className="font-mono text-xs font-semibold text-gray-800 w-9 text-right">
              {idea.score.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-gray-600">
            {idea.wins}W · {idea.losses}L · {idea.voteCount}{" "}
            {idea.voteCount === 1 ? "vote" : "votes"}
          </span>
        </div>
      </div>

      {/* Tag chips + picker */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 relative">
        {idea.tags.map((tag) => (
          <span
            key={tag.id}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${TAG_TYPE_STYLES[tag.type] ?? "bg-gray-100 text-gray-600"}`}
          >
            {tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
              className="hover:opacity-60 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        {unpickedTags.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowTagPicker((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-800 border border-dashed border-gray-300 rounded-full px-2 py-0.5"
            >
              + tag
            </button>
            {showTagPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTagPicker(false)}
                  aria-hidden
                />
                <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-[160px]">
                {(
                  [
                    { key: "issue_category", label: "Issue Category", dot: "bg-indigo-400" },
                    { key: "scale", label: "Scale", dot: "bg-teal-400" },
                  ] as const
                ).map(({ key, label, dot }) => {
                  const group = unpickedTags.filter((t) => t.type === key);
                  if (group.length === 0) return null;
                  return (
                    <div key={key}>
                      <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {label}
                      </p>
                      {group.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => addTag(tag.id)}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Glossary term chips + picker */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 relative">
        {idea.glossaryTerms.map((term) => (
          <span
            key={term.id}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${term.archivedAt ? "bg-gray-100 text-gray-500 line-through" : "bg-amber-100 text-amber-700"}`}
          >
            {term.title}
            <button
              onClick={() => removeTerm(term.id)}
              aria-label={`Remove glossary term ${term.title}`}
              className="hover:opacity-60 leading-none"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
        {unpickedGlossaryTerms.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowGlossaryPicker((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-800 border border-dashed border-gray-300 rounded-full px-2 py-0.5"
            >
              + glossary
            </button>
            {showGlossaryPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowGlossaryPicker(false)}
                  aria-hidden
                />
                <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-[200px] max-h-48 overflow-y-auto">
                  {unpickedGlossaryTerms.map((term) => (
                    <button
                      key={term.id}
                      onClick={() => addTerm(term.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-amber-50"
                    >
                      {term.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-0">
        {idea.translations.map((t) =>
          editingLang === t.language ? (
            <EditTranslationForm
              key={t.id}
              translation={t}
              onSave={(text) => {
                onUpsertTranslation(idea.id, t.language, text);
                setEditingLang(null);
              }}
              onCancel={() => setEditingLang(null)}
            />
          ) : (
            <TranslationRow
              key={t.id}
              translation={t}
              onEdit={() => {
                setAddingTranslation(false);
                setEditingLang(t.language);
              }}
            />
          ),
        )}
      </div>

      {!hasAllLanguages && !addingTranslation && editingLang === null && (
        <button
          onClick={() => setAddingTranslation(true)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add translation
        </button>
      )}

      {addingTranslation && (
        <AddTranslationForm
          existingLanguages={existingLanguages}
          onSave={(language, text) => {
            onUpsertTranslation(idea.id, language, text);
            setAddingTranslation(false);
          }}
          onCancel={() => setAddingTranslation(false)}
        />
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => setShowLinkedSuggestions((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium"
        >
          <span>{showLinkedSuggestions ? "▾" : "▸"}</span> Linked Suggestions
          {linkedSuggestions && linkedSuggestions.length > 0 && (
            <span className="text-gray-500">({linkedSuggestions.length})</span>
          )}
        </button>

        {showLinkedSuggestions && (
          <div className="mt-2 space-y-1">
            {linkedLoading && <p className="text-xs text-gray-500">Loading…</p>}
            {linkError && <p className="text-xs text-red-600">{linkError}</p>}
            {linkedSuggestions?.map((s) => (
              <div key={s.id} className="flex items-start gap-2 py-1 border-t border-gray-50 text-xs">
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded-full font-medium ${SUGGESTION_STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {s.status}
                </span>
                <span className="flex-1 text-gray-700 leading-snug line-clamp-2">{s.text}</span>
                <button
                  onClick={() => unlinkSuggestion.mutate({ suggestionId: s.id, ideaId: idea.id })}
                  disabled={unlinkSuggestion.isPending}
                  className="text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50"
                >
                  Unlink
                </button>
              </div>
            ))}
            {!linkedLoading && linkedSuggestions?.length === 0 && (
              <p className="text-xs text-gray-500 py-1">No suggestions linked yet.</p>
            )}

            <div className="relative mt-2">
              <button
                onClick={() => setShowSuggestionPicker((v) => !v)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Link suggestion
              </button>
              {showSuggestionPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSuggestionPicker(false)} />
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
                        {candidateSuggestions?.map((s) => (
                          <Command.Item
                            key={s.id}
                            value={s.text}
                            onSelect={() =>
                              linkSuggestion.mutate({ suggestionId: s.id, ideaId: idea.id })
                            }
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
    </div>
  );
}

export function AddIdeaForm({
  bankId,
  onAdd,
  onCancel,
}: {
  bankId: string;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const [language, setLanguage] = useState<Language>("en");
  const [text, setText] = useState("");

  const createIdea = trpc.ideaBanks.createIdea.useMutation();
  const upsertTranslation = trpc.ideaBanks.upsertTranslation.useMutation();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const idea = await createIdea.mutateAsync({ ideaBankId: bankId });
    await upsertTranslation.mutateAsync({
      ideaId: idea.id,
      language,
      text: text.trim(),
    });
    onAdd();
  };

  const isPending = createIdea.isPending || upsertTranslation.isPending;

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">New Idea</h3>
      <div className="space-y-2">
        <div className="flex gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Idea text…"
            rows={2}
            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isPending}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isPending ? "Saving…" : "Add Idea"}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-gray-600 text-xs rounded border border-gray-300 hover:bg-white font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
