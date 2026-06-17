"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/clerk-react";
import { Command } from "cmdk";
import { trpc, type RouterOutput } from "@/lib/trpc";

const LANGUAGES = ["en", "es", "fr", "pt", "zh"] as const;
type Language = (typeof LANGUAGES)[number];

function toDatetimeLocal(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function windowStatus(party: {
  startAt: Date | string;
  endAt: Date | string | null;
  status: string;
}) {
  if (party.status === "closed") return "closed" as const;
  const now = new Date();
  if (now < new Date(party.startAt)) return "scheduled" as const;
  if (party.endAt && now > new Date(party.endAt)) return "ended" as const;
  return "open" as const;
}

const WINDOW_STATUS_STYLES = {
  open: "bg-green-100 text-green-700",
  scheduled: "bg-amber-100 text-amber-700",
  ended: "bg-gray-100 text-gray-600",
  closed: "bg-gray-100 text-gray-600",
} as const;

const SUGGESTION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  merged: "bg-blue-100 text-blue-700",
};

type Tag = RouterOutput["tags"]["list"][number];
type GlossaryTerm = RouterOutput["glossary"]["list"][number];

const TAG_TYPE_STYLES: Record<string, string> = {
  issue_category: "bg-indigo-100 text-indigo-700",
  scale: "bg-teal-100 text-teal-700",
};

type Translation = { id: string; ideaId: string; language: string; text: string };
type Idea = {
  id: string;
  isActive: boolean;
  wins: number;
  losses: number;
  score: number;
  voteCount: number;
  createdAt: Date | string;
  translations: Translation[];
  tags: Tag[];
  glossaryTerms: GlossaryTerm[];
};

// ─── Branding field helper ────────────────────────────────────────────────────

function BrandingField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  onClear,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label htmlFor={id} className="block text-xs font-medium text-gray-700">{label}</label>
        {onClear && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}

// ─── Bank Branding Section ────────────────────────────────────────────────────

function MarkdownField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white font-mono placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}

function BankBrandingSection({ bank }: { bank: { id: string; title: string | null; subtitle: string | null; headerImageUrl: string | null; questionHeading: string | null } }) {
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
      <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Campaign Branding
      </h2>
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

// ─── Create Bank Form ─────────────────────────────────────────────────────────

function CreateBankForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const create = trpc.ideaBanks.create.useMutation({
    onSuccess: (bank) => onCreated(bank.id),
  });

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 mb-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">New Idea Bank</h3>
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bank name…"
          autoFocus
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
        {create.error && <p className="text-xs text-red-600">{create.error.message}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => name.trim() && create.mutate({ name: name.trim() })}
            disabled={!name.trim() || create.isPending}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {create.isPending ? "Creating…" : "Create Bank"}
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

// ─── Bank List ───────────────────────────────────────────────────────────────

function BankList() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = trpc.ideaBanks.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">Error: {error.message}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Idea Banks</h1>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
          >
            + New Bank
          </button>
        )}
      </div>

      {showCreate && (
        <CreateBankForm
          onCreated={(id) => {
            setShowCreate(false);
            refetch();
            router.push(`/admin?bankId=${id}`);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {!data?.length ? (
        <p className="text-sm text-gray-600">No idea banks found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((bank) => (
            <button
              key={bank.id}
              onClick={() => router.push(`/admin?bankId=${bank.id}`)}
              className="text-left border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="font-medium text-gray-900 group-hover:text-blue-700">{bank.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {Number(bank.ideaCount)} {Number(bank.ideaCount) === 1 ? "idea" : "ideas"}
              </div>
              <div className="text-xs text-gray-600 mt-1 font-mono">
                {new Date(bank.createdAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Translation Row ──────────────────────────────────────────────────────────

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

// ─── Edit Translation Form ────────────────────────────────────────────────────

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

// ─── Add Translation Form ─────────────────────────────────────────────────────

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

// ─── Idea Card ────────────────────────────────────────────────────────────────

function IdeaCard({
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
              <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-[160px]">
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

// ─── Add Idea Form ────────────────────────────────────────────────────────────

function AddIdeaForm({
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

// ─── Pair Row ─────────────────────────────────────────────────────────────────

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

// ─── Ballot Card ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-amber-100 text-amber-700",
  submitted: "bg-green-100 text-green-700",
};

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

function BallotCard({
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

// ─── Party Section (shown on bank detail page) ───────────────────────────────

const PARTY_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

function CreatePartyForm({
  bankId,
  onCreated,
  onCancel,
}: {
  bankId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"standard" | "always_on">("standard");
  const [defaultPairCount, setDefaultPairCount] = useState(10);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const create = trpc.parties.create.useMutation({ onSuccess: onCreated });

  function handleCreate() {
    if (!name.trim()) return;
    create.mutate({
      ideaBankId: bankId,
      name: name.trim(),
      mode,
      defaultPairCount: mode === "always_on" ? defaultPairCount : undefined,
      startAt: startAt ? new Date(startAt).toISOString() : undefined,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
    });
  }

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">New Party</h3>
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Party name (e.g. April Town Hall)…"
          autoFocus
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("standard")}
            className={`flex-1 py-1.5 text-xs rounded border font-medium transition-colors ${mode === "standard" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => setMode("always_on")}
            className={`flex-1 py-1.5 text-xs rounded border font-medium transition-colors ${mode === "always_on" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
          >
            Always On
          </button>
        </div>
        {mode === "always_on" && (
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">Pairs per ballot</label>
            <input
              type="number"
              min={1}
              max={50}
              value={defaultPairCount}
              onChange={(e) => setDefaultPairCount(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="w-20 border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500 text-center"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">Opens (optional)</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">Closes (optional)</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        {create.error && <p className="text-xs text-red-600">{create.error.message}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || create.isPending}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {create.isPending ? "Creating…" : "Create Party"}
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

// ─── Suggestion display components ───────────────────────────────────────────

type SuggestionRow = {
  id: string;
  text: string;
  tags: Tag[];
  testimonial: string | null;
  status: string;
  linkedIdeaCount: number;
  createdAt: Date | string;
  voterFirstName: string | null;
  voterLastName: string | null;
  partyName?: string | null;
};

function SuggestionCard({ suggestion }: { suggestion: SuggestionRow }) {
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

      {suggestion.testimonial && (
        <p className="text-xs text-gray-600 italic leading-relaxed border-l-2 border-gray-200 pl-3">
          {suggestion.testimonial}
        </p>
      )}

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

function SuggestionsSection({ data, isLoading }: { data: SuggestionRow[] | undefined; isLoading: boolean }) {
  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Suggested Ideas
        {data && data.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-500">({data.length})</span>
        )}
      </h2>

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && !data?.length && (
        <p className="text-sm text-gray-600">No suggestions yet.</p>
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

function PartySuggestionsSection({ partyId }: { partyId: string }) {
  const { data, isLoading } = trpc.suggestedIdeas.listByParty.useQuery({ partyId });
  return <SuggestionsSection data={data} isLoading={isLoading} />;
}

// ─── Testimonials Section ─────────────────────────────────────────────────────

function PartyTestimonialsSection({ partyId }: { partyId: string }) {
  const { data, isLoading } = trpc.testimonials.listForParty.useQuery({ partyId });

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Testimonials
        {data && data.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-500">({data.length})</span>
        )}
      </h2>

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && !data?.length && (
        <p className="text-sm text-gray-600">No testimonials yet.</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{t.text}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(t.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BankTestimonialsSection({ ideaBankId }: { ideaBankId: string }) {
  const { data, isLoading } = trpc.testimonials.listForBank.useQuery({ ideaBankId });

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Testimonials
        {data && data.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-500">({data.length})</span>
        )}
      </h2>

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && !data?.length && (
        <p className="text-sm text-gray-600">No testimonials yet.</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{t.text}</p>
              <div className="flex items-center gap-2 mt-2">
                {t.partyName && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {t.partyName}
                  </span>
                )}
                <p className="text-xs text-gray-500">
                  {new Date(t.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Affiliation Groups Section ──────────────────────────────────────────────

function AffiliationGroupsSection({ ideaBankId }: { ideaBankId: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.affiliations.listForBank.useQuery({ ideaBankId });
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const createMutation = trpc.affiliations.create.useMutation({
    onSuccess: () => {
      setNewName("");
      setAddError(null);
      utils.affiliations.listForBank.invalidate({ ideaBankId });
    },
    onError: (err) => setAddError(err.message),
  });

  const deleteMutation = trpc.affiliations.delete.useMutation({
    onSuccess: () => utils.affiliations.listForBank.invalidate({ ideaBankId }),
  });

  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  function handleDelete(id: string) {
    setDeleteErrors((prev) => ({ ...prev, [id]: "" }));
    deleteMutation.mutate(
      { id },
      {
        onError: (err) => setDeleteErrors((prev) => ({ ...prev, [id]: err.message })),
      },
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Community & Political Groups</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        These appear as multiselect options on the voter intake form for this campaign.
      </p>

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-gray-500 mb-3">No groups yet. Add one below.</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2.5 bg-white"
            >
              <span className="text-sm text-gray-800">{group.name}</span>
              <div className="flex items-center gap-3">
                {deleteErrors[group.id] && (
                  <span className="text-xs text-red-600">{deleteErrors[group.id]}</span>
                )}
                <button
                  onClick={() => handleDelete(group.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete ${group.name}`}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) createMutation.mutate({ ideaBankId, name: newName.trim() });
        }}
        className="flex gap-2"
      >
        <input
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setAddError(null);
          }}
          placeholder="Group name (e.g. Working Families Party)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!newName.trim() || createMutation.isPending}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          Add
        </button>
      </form>
      {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
    </div>
  );
}

// ─── Post-Vote Section ────────────────────────────────────────────────────────

function PostVoteSection({ bank }: { bank: { id: string; postVoteMessage: string | null } }) {
  const utils = trpc.useUtils();
  const [message, setMessage] = useState(bank.postVoteMessage ?? "");
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  const update = trpc.ideaBanks.update.useMutation({
    onSuccess: (data) => {
      utils.ideaBanks.getById.invalidate({ id: bank.id });
      setMessage(data.postVoteMessage ?? "");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      setShowSaved(true);
      savedTimer.current = setTimeout(() => setShowSaved(false), 2500);
    },
  });

  const dirty = message !== (bank.postVoteMessage ?? "");

  function save() {
    update.mutate({ id: bank.id, postVoteMessage: message.trim() || null });
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white mb-6">
      <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Post-Vote
      </h2>
      <div className="space-y-3">
        <div>
          <label htmlFor={`post-vote-msg-${bank.id}`} className="block text-xs font-medium text-gray-700 mb-0.5">
            Thank-you message
          </label>
          <p className="text-xs text-gray-500 mb-1">Shown immediately after ballot submission.</p>
          <input
            id={`post-vote-msg-${bank.id}`}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Thank you for voting!"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500">
          Survey questions shown after voting are configured in the <strong>Survey Questions</strong> section below.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={!dirty || update.isPending}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40 font-medium"
          >
            {update.isPending ? "Saving…" : "Save"}
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

// ─── Assessment Questions Section ────────────────────────────────────────────

function AssessmentQuestionsSection({
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

  const title = stage === "pre" ? "Pre-Vote Questions" : "Post-Vote Questions";
  const hint =
    stage === "pre"
      ? "Shown on the voter registration form before voting."
      : "Shown after ballot submission.";

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      </div>

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

// ─── Assessment Results Section ───────────────────────────────────────────────

function AssessmentResultsSection({
  ideaBankId,
  stage,
}: {
  ideaBankId: string;
  stage: "pre" | "post";
}) {
  const { data, isLoading } = trpc.assessment.resultsForBank.useQuery({ ideaBankId, stage });

  if (isLoading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (!data?.length) return null;

  const title = stage === "pre" ? "Pre-Vote Results" : "Post-Vote Results";

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
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

// ─── Bank Suggestions Section ─────────────────────────────────────────────────

function BankSuggestionsSection({ ideaBankId }: { ideaBankId: string }) {
  const { data, isLoading } = trpc.suggestedIdeas.listByBank.useQuery({ ideaBankId });
  return <SuggestionsSection data={data} isLoading={isLoading} />;
}

// ─── Party Section (shown on bank detail page) ───────────────────────────────

function PartySection({ bankId }: { bankId: string }) {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.parties.listByBank.useQuery({ ideaBankId: bankId });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Parties</h2>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium"
          >
            + New Party
          </button>
        )}
      </div>

      {showCreate && (
        <CreatePartyForm
          bankId={bankId}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && !data?.length && <p className="text-sm text-gray-600">No parties yet.</p>}

      {data?.length ? (
        <div className="space-y-2">
          {data.map((party) => (
            <button
              key={party.id}
              onClick={() => router.push(`/admin?bankId=${bankId}&partyId=${party.id}`)}
              className="w-full text-left border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900 group-hover:text-blue-700 flex-1">
                  {party.name}
                </span>
                {party.mode === "always_on" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">
                    Always On
                  </span>
                )}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${PARTY_STATUS_STYLES[party.status] ?? ""}`}
                >
                  {party.status}
                </span>
              </div>
              <div className="flex gap-4 mt-1.5 text-xs text-gray-600">
                <span>
                  {party.ballotCount} {party.ballotCount === 1 ? "ballot" : "ballots"}
                </span>
                <span>{party.voteCount} votes</span>
                <span>{new Date(party.startAt).toLocaleDateString()}</span>
                {party.endAt && <span>→ {new Date(party.endAt).toLocaleDateString()}</span>}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Party Branding Section ───────────────────────────────────────────────────

function PartyBrandingSection({
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
      <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
        Branding Override
      </h2>
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

// ─── Party Detail (shown when partyId is in query params) ────────────────────

function PartyDetail({ bankId, partyId }: { bankId: string; partyId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [pairCount, setPairCount] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [startAtOverride, setStartAtOverride] = useState<string | null>(null);
  const [endAtOverride, setEndAtOverride] = useState<string | null>(null);

  const { data: ballotList, refetch: refetchBallots } = trpc.ballots.listByParty.useQuery({
    partyId,
  });
  const { data: partiesList } = trpc.parties.listByBank.useQuery({ ideaBankId: bankId });
  const party = partiesList?.find((p) => p.id === partyId);

  const windowStartAt = startAtOverride ?? toDatetimeLocal(party?.startAt);
  const windowEndAt = endAtOverride ?? toDatetimeLocal(party?.endAt);

  const generate = trpc.ballots.generate.useMutation({
    onSuccess: () => {
      setGenerateError(null);
      refetchBallots();
    },
    onError: (e) => setGenerateError(e.message),
  });

  const close = trpc.parties.close.useMutation({
    onSuccess: () => utils.parties.listByBank.invalidate({ ideaBankId: bankId }),
  });

  const update = trpc.parties.update.useMutation({
    onSuccess: () => utils.parties.listByBank.invalidate({ ideaBankId: bankId }),
  });

  const isClosed = party?.status === "closed";
  const windowDirty =
    party &&
    (startAtOverride !== null || endAtOverride !== null) &&
    (toDatetimeLocal(party.startAt) !== windowStartAt ||
      toDatetimeLocal(party.endAt) !== windowEndAt);

  function saveWindow() {
    if (!party) return;
    update.mutate({
      id: partyId,
      startAt: windowStartAt ? new Date(windowStartAt).toISOString() : undefined,
      endAt: windowEndAt ? new Date(windowEndAt).toISOString() : null,
    });
  }

  const currentWindowStatus = party ? windowStatus(party) : null;

  return (
    <div>
      <button
        onClick={() => router.push(`/admin?bankId=${bankId}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 group"
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to Bank
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{party?.name ?? "Party"}</h1>
            {party?.mode === "always_on" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Always On
              </span>
            )}
            {party && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${PARTY_STATUS_STYLES[party.status] ?? ""}`}
              >
                {party.status}
              </span>
            )}
            {currentWindowStatus && currentWindowStatus !== "closed" && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${WINDOW_STATUS_STYLES[currentWindowStatus]}`}
              >
                {currentWindowStatus === "open"
                  ? "voting open"
                  : currentWindowStatus === "scheduled"
                    ? "scheduled"
                    : "voting ended"}
              </span>
            )}
          </div>
        </div>
        {!isClosed && party && (
          <button
            onClick={() => close.mutate({ id: partyId })}
            disabled={close.isPending}
            className="px-3 py-1.5 text-red-600 text-xs rounded border border-red-200 hover:bg-red-50 font-medium disabled:opacity-50"
          >
            {close.isPending ? "Closing…" : "Close Party"}
          </button>
        )}
      </div>

      {/* Voting window editor */}
      {party && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white mb-6">
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Voting Window
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Opens</label>
              <input
                type="datetime-local"
                value={windowStartAt}
                onChange={(e) => setStartAtOverride(e.target.value)}
                disabled={isClosed}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Closes (optional)</label>
              <input
                type="datetime-local"
                value={windowEndAt}
                onChange={(e) => setEndAtOverride(e.target.value)}
                disabled={isClosed}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          {!isClosed && (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={saveWindow}
                disabled={!windowDirty || update.isPending}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40 font-medium"
              >
                {update.isPending ? "Saving…" : "Save Window"}
              </button>
              {update.isSuccess && !windowDirty && (
                <span className="text-xs text-green-600">Saved</span>
              )}
              {update.error && <span className="text-xs text-red-600">{update.error.message}</span>}
            </div>
          )}
        </div>
      )}

      {/* Shareable URL (always-on parties only) */}
      {party?.mode === "always_on" && (
        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 mb-6">
          <h2 className="text-xs font-semibold text-purple-800 uppercase tracking-wide mb-2">
            Shareable URL
          </h2>
          <p className="text-xs text-purple-700 mb-2">
            Anyone who visits this link gets a ballot created for them automatically.
            {party.defaultPairCount && ` Each ballot contains ${party.defaultPairCount} pairs.`}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-purple-200 rounded px-2 py-1.5 text-purple-900 overflow-x-auto whitespace-nowrap">
              {`${window.location.origin}/?party=${partyId}`}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?party=${partyId}`)}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 font-medium shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Party branding override */}
      {party && (
        <PartyBrandingSection key={party.id} party={party} bankId={bankId} isClosed={isClosed} />
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Ballots</h2>
        {!isClosed && party?.mode !== "always_on" && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={pairCount}
              onChange={(e) => setPairCount(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="w-14 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500 text-center"
            />
            <span className="text-xs text-gray-600">pairs</span>
            <button
              onClick={() => generate.mutate({ partyId, pairCount })}
              disabled={generate.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {generate.isPending ? "Generating…" : "Generate Ballot"}
            </button>
          </div>
        )}
        {party?.mode === "always_on" && (
          <p className="text-xs text-gray-500">Ballots are created automatically when voters visit the link.</p>
        )}
      </div>

      {generateError && <p className="text-sm text-red-600 mb-3">{generateError}</p>}

      {ballotList?.length ? (
        <div className="space-y-2">
          {ballotList.map((ballot) => (
            <BallotCard
              key={ballot.id}
              ballot={ballot}
              expanded={expandedId === ballot.id}
              onToggle={() => setExpandedId(expandedId === ballot.id ? null : ballot.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600">No ballots yet.</p>
      )}

      <div className="my-8 border-t border-gray-200" />
      <PartySuggestionsSection partyId={partyId} />

      <div className="my-8 border-t border-gray-200" />
      <PartyTestimonialsSection partyId={partyId} />
    </div>
  );
}

// ─── Bank Detail ──────────────────────────────────────────────────────────────

function BankDetail({ bankId }: { bankId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = trpc.ideaBanks.getById.useQuery({ id: bankId });
  const { data: availableTags = [] } = trpc.tags.list.useQuery(undefined);
  const { data: availableGlossaryTerms = [] } = trpc.glossary.list.useQuery({ includeArchived: true });
  const [showAddForm, setShowAddForm] = useState(false);

  const setIdeaTags = trpc.ideaBanks.setIdeaTags.useMutation({
    onSuccess: () => utils.ideaBanks.getById.invalidate({ id: bankId }),
  });
  const setIdeaGlossaryTerms = trpc.glossary.setIdeaTerms.useMutation({
    onSuccess: () => utils.ideaBanks.getById.invalidate({ id: bankId }),
  });
  const upsertTranslation = trpc.ideaBanks.upsertTranslation.useMutation({
    onSuccess: () => refetch(),
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{data.name}</h1>
          <p className="text-sm text-gray-600 mt-0.5">{data.ideas.length} ideas</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
          >
            + Add Idea
          </button>
        )}
      </div>

      <BankBrandingSection key={data.id} bank={data} />

      <PostVoteSection key={`pv-${data.id}`} bank={data} />

      {showAddForm && (
        <AddIdeaForm
          bankId={bankId}
          onAdd={() => {
            setShowAddForm(false);
            refetch();
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
            onUpsertTranslation={(ideaId, language, text) =>
              upsertTranslation.mutate({ ideaId, language, text })
            }
          />
        ))}
      </div>

      <div className="my-8 border-t border-gray-200" />
      <AffiliationGroupsSection ideaBankId={bankId} />

      <div className="my-8 border-t border-gray-200" />
      <AssessmentQuestionsSection ideaBankId={bankId} stage="pre" />

      <div className="my-8 border-t border-gray-200" />
      <AssessmentQuestionsSection ideaBankId={bankId} stage="post" />

      <div className="my-8 border-t border-gray-200" />
      <AssessmentResultsSection ideaBankId={bankId} stage="pre" />

      <div className="my-8 border-t border-gray-200" />
      <AssessmentResultsSection ideaBankId={bankId} stage="post" />

      <div className="my-8 border-t border-gray-200" />
      <PartySection bankId={bankId} />

      <div className="my-8 border-t border-gray-200" />
      <BankSuggestionsSection ideaBankId={bankId} />

      <div className="my-8 border-t border-gray-200" />
      <BankTestimonialsSection ideaBankId={bankId} />
    </div>
  );
}

// ─── Tag Management Section (platform-level) ─────────────────────────────────

function TagManagementSection() {
  const utils = trpc.useUtils();
  const { data: allTags, isLoading } = trpc.tags.list.useQuery({ includeArchived: true });
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"issue_category" | "scale">("issue_category");
  const [addError, setAddError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const createMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      setNewName("");
      setAddError(null);
      utils.tags.list.invalidate();
    },
    onError: (err) => setAddError(err.message),
  });
  const archiveMutation = trpc.tags.archive.useMutation({
    onSuccess: () => utils.tags.list.invalidate(),
  });
  const unarchiveMutation = trpc.tags.unarchive.useMutation({
    onSuccess: () => utils.tags.list.invalidate(),
  });

  const activeTags = allTags?.filter((t) => !t.archivedAt) ?? [];
  const archivedTags = allTags?.filter((t) => t.archivedAt) ?? [];
  const issueCategories = activeTags.filter((t) => t.type === "issue_category");
  const scaleTags = activeTags.filter((t) => t.type === "scale");

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Tag Vocabulary</h2>
      <p className="text-xs text-gray-500 mb-4">
        Platform-wide controlled vocabulary. Tags can be archived but not deleted.
      </p>

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && (
        <div className="space-y-4">
          {[
            { label: "Issue Categories", tags: issueCategories, type: "issue_category" as const },
            { label: "Scale", tags: scaleTags, type: "scale" as const },
          ].map(({ label, tags }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                {label}
              </p>
              {tags.length === 0 && (
                <p className="text-xs text-gray-500 italic">None yet.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-1.5 border border-gray-200 rounded-full pl-3 pr-1.5 py-1 bg-white"
                  >
                    <span className="text-xs text-gray-800">{tag.name}</span>
                    <button
                      onClick={() => archiveMutation.mutate({ id: tag.id })}
                      disabled={archiveMutation.isPending}
                      title="Archive tag"
                      className="text-gray-400 hover:text-gray-600 text-xs leading-none disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {archivedTags.length > 0 && (
            <div>
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                {showArchived ? "▾" : "▸"} Archived ({archivedTags.length})
              </button>
              {showArchived && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {archivedTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-1.5 border border-dashed border-gray-200 rounded-full pl-3 pr-1.5 py-1 bg-gray-50"
                    >
                      <span className="text-xs text-gray-400 line-through">{tag.name}</span>
                      <span className="text-xs text-gray-400">({tag.type === "issue_category" ? "cat" : "scale"})</span>
                      <button
                        onClick={() => unarchiveMutation.mutate({ id: tag.id })}
                        disabled={unarchiveMutation.isPending}
                        title="Restore tag"
                        className="text-gray-400 hover:text-green-600 text-xs leading-none disabled:opacity-50"
                      >
                        ↺
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) createMutation.mutate({ name: newName.trim(), type: newType });
            }}
            className="flex gap-2 pt-2"
          >
            <input
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setAddError(null); }}
              placeholder="Tag name…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as "issue_category" | "scale")}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="issue_category">Issue Category</option>
              <option value="scale">Scale</option>
            </select>
            <button
              type="submit"
              disabled={!newName.trim() || createMutation.isPending}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Add
            </button>
          </form>
          {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Glossary Management Section ─────────────────────────────────────────────

function GlossaryManagementSection() {
  const { data } = trpc.glossary.list.useQuery(undefined);
  const count = data?.length ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Glossary</h2>
        <Link
          href="/admin/glossary"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Manage glossary →
        </Link>
      </div>
      <p className="text-xs text-gray-500">
        {count} term{count !== 1 ? "s" : ""} defined. Link terms to individual ideas via the idea
        card in each bank.
      </p>
    </div>
  );
}

// ─── Admin Content (uses useSearchParams) ────────────────────────────────────

function AdminContent() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get("bankId");
  const partyId = searchParams.get("partyId");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {bankId && partyId ? (
          <PartyDetail bankId={bankId} partyId={partyId} />
        ) : bankId ? (
          <BankDetail bankId={bankId} />
        ) : (
          <>
            <BankList />
            <div className="my-8 border-t border-gray-200" />
            <TagManagementSection />
            <div className="my-8 border-t border-gray-200" />
            <GlossaryManagementSection />
          </>
        )}
      </div>
    </main>
  );
}

// ─── Admin Guard ──────────────────────────────────────────────────────────────

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, sessionClaims } = useAuth();
  const router = useRouter();
  const isAdmin =
    (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!isAdmin) router.replace("/");
  }, [isLoaded, isSignedIn, isAdmin, router]);

  if (!isLoaded || !isSignedIn || !isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-600">
          {!isLoaded ? "Loading…" : isSignedIn && !isAdmin ? "You don't have permission to access this page." : "Redirecting…"}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-600">Loading…</div>
          </main>
        }
      >
        <AdminContent />
      </Suspense>
    </AdminGuard>
  );
}
