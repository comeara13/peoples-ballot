"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
};

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
  onUpsertTranslation,
}: {
  idea: Idea;
  availableTags: Tag[];
  onSetTags: (ideaId: string, tagIds: string[]) => void;
  onUpsertTranslation: (ideaId: string, language: string, text: string) => void;
}) {
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [addingTranslation, setAddingTranslation] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showLinkedSuggestions, setShowLinkedSuggestions] = useState(false);
  const [showSuggestionPicker, setShowSuggestionPicker] = useState(false);
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
      utils.suggestionLinks.listForIdea.invalidate({ ideaId: idea.id });
      utils.suggestionLinks.candidateSuggestions.invalidate({ ideaId: idea.id });
      utils.suggestedIdeas.invalidate();
      setShowSuggestionPicker(false);
    },
  });
  const unlinkSuggestion = trpc.suggestionLinks.unlink.useMutation({
    onSuccess: () => {
      utils.suggestionLinks.listForIdea.invalidate({ ideaId: idea.id });
      utils.suggestionLinks.candidateSuggestions.invalidate({ ideaId: idea.id });
      utils.suggestedIdeas.invalidate();
    },
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

function BallotCard({
  ballot,
  expanded,
  onToggle,
}: {
  ballot: {
    id: string;
    status: string;
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
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-mono text-xs text-gray-500 shrink-0 select-all">{ballot.id}</span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[ballot.status] ?? STATUS_STYLES.pending}`}
        >
          {ballot.status}
        </span>
        <span className="text-sm text-gray-700">
          {ballot.voteCount}/{ballot.pairCount} votes
        </span>
        <span className="text-xs text-gray-600 font-mono">
          {new Date(ballot.createdAt).toLocaleString()}
        </span>
        <span className="ml-auto text-gray-400 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

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
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const create = trpc.parties.create.useMutation({ onSuccess: onCreated });

  function handleCreate() {
    if (!name.trim()) return;
    create.mutate({
      ideaBankId: bankId,
      name: name.trim(),
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
      utils.suggestionLinks.listForSuggestion.invalidate({ suggestionId: suggestion.id });
      utils.suggestionLinks.candidateIdeas.invalidate({ suggestionId: suggestion.id });
      utils.suggestedIdeas.invalidate();
      setShowIdeaPicker(false);
    },
  });
  const unlink = trpc.suggestionLinks.unlink.useMutation({
    onSuccess: () => {
      utils.suggestionLinks.listForSuggestion.invalidate({ suggestionId: suggestion.id });
      utils.suggestionLinks.candidateIdeas.invalidate({ suggestionId: suggestion.id });
      utils.suggestedIdeas.invalidate();
    },
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
        </button>

        {showLinkedIdeas && (
          <div className="mt-2 space-y-1">
            {linkedLoading && <p className="text-xs text-gray-500">Loading…</p>}
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

// ─── Assessment Questions Section ────────────────────────────────────────────

function AssessmentQuestionsSection({ ideaBankId }: { ideaBankId: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.assessment.listQuestionsForBank.useQuery({ ideaBankId });
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<"likert" | "yes_no">("likert");
  const [addError, setAddError] = useState<string | null>(null);

  const createMutation = trpc.assessment.createQuestion.useMutation({
    onSuccess: () => {
      setNewText("");
      setAddError(null);
      utils.assessment.listQuestionsForBank.invalidate({ ideaBankId });
      utils.assessment.resultsForBank.invalidate({ ideaBankId });
    },
    onError: (err) => setAddError(err.message),
  });

  const deleteMutation = trpc.assessment.deleteQuestion.useMutation({
    onSuccess: () => {
      utils.assessment.listQuestionsForBank.invalidate({ ideaBankId });
      utils.assessment.resultsForBank.invalidate({ ideaBankId });
    },
  });

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Pre-Assessment Questions</h2>
        <p className="text-xs text-gray-500 mt-1">
          Shown at the bottom of the voter registration form. Responses are stored per ballot.
        </p>
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
          if (newText.trim()) createMutation.mutate({ ideaBankId, text: newText.trim(), type: newType });
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

function AssessmentResultsSection({ ideaBankId }: { ideaBankId: string }) {
  const { data, isLoading } = trpc.assessment.resultsForBank.useQuery({ ideaBankId });

  if (isLoading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (!data?.length) return null;

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">Assessment Results</h2>
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
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{party?.name ?? "Party"}</h1>
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

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Ballots</h2>
        {!isClosed && (
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
    </div>
  );
}

// ─── Bank Detail ──────────────────────────────────────────────────────────────

function BankDetail({ bankId }: { bankId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = trpc.ideaBanks.getById.useQuery({ id: bankId });
  const { data: availableTags = [] } = trpc.tags.list.useQuery(undefined);
  const [showAddForm, setShowAddForm] = useState(false);

  const setIdeaTags = trpc.ideaBanks.setIdeaTags.useMutation({
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
            onUpsertTranslation={(ideaId, language, text) =>
              upsertTranslation.mutate({ ideaId, language, text })
            }
          />
        ))}
      </div>

      <div className="my-8 border-t border-gray-200" />
      <AffiliationGroupsSection ideaBankId={bankId} />

      <div className="my-8 border-t border-gray-200" />
      <AssessmentQuestionsSection ideaBankId={bankId} />

      <div className="my-8 border-t border-gray-200" />
      <AssessmentResultsSection ideaBankId={bankId} />

      <div className="my-8 border-t border-gray-200" />
      <PartySection bankId={bankId} />

      <div className="my-8 border-t border-gray-200" />
      <BankSuggestionsSection ideaBankId={bankId} />
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
          </>
        )}
      </div>
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-600">Loading…</div>
        </main>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
