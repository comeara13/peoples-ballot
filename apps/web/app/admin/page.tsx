"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

const LANGUAGES = ["en", "es", "fr", "pt", "zh"] as const;
type Language = (typeof LANGUAGES)[number];

type Translation = { id: string; ideaId: string; language: string; text: string };
type Idea = {
  id: string;
  category: string | null;
  isActive: boolean;
  wins: number;
  losses: number;
  score: number;
  voteCount: number;
  createdAt: Date | string;
  translations: Translation[];
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
        {create.error && (
          <p className="text-xs text-red-600">{create.error.message}</p>
        )}
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
              <div className="font-medium text-gray-900 group-hover:text-blue-700">
                {bank.name}
              </div>
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

function TranslationRow({
  translation,
  onEdit,
}: {
  translation: Translation;
  onEdit: () => void;
}) {
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
  onUpdateCategory,
  onUpsertTranslation,
}: {
  idea: Idea;
  onUpdateCategory: (id: string, category: string | null) => void;
  onUpsertTranslation: (ideaId: string, language: string, text: string) => void;
}) {
  const [category, setCategory] = useState(idea.category ?? "");
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [addingTranslation, setAddingTranslation] = useState(false);

  const handleCategoryBlur = () => {
    const trimmed = category.trim() || null;
    if (trimmed !== idea.category) {
      onUpdateCategory(idea.id, trimmed);
    }
  };

  const existingLanguages = idea.translations.map((t) => t.language);
  const hasAllLanguages = LANGUAGES.every((l) => existingLanguages.includes(l));

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-xs text-gray-500 shrink-0 select-all">
          {idea.id.slice(0, 8)}
        </span>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={handleCategoryBlur}
          placeholder="No category"
          className="flex-1 text-sm text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none py-0.5 bg-transparent placeholder:text-gray-500"
        />
        <div className="shrink-0 flex flex-col items-end gap-1">
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
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [text, setText] = useState("");

  const createIdea = trpc.ideaBanks.createIdea.useMutation();
  const upsertTranslation = trpc.ideaBanks.upsertTranslation.useMutation();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const idea = await createIdea.mutateAsync({
      ideaBankId: bankId,
      category: category.trim() || undefined,
    });
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
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
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
      <span className="text-gray-500 font-mono text-xs w-5 shrink-0 mt-0.5">
        {pair.position}.
      </span>
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
        <span className="font-mono text-xs text-gray-500 shrink-0 select-all">
          {ballot.id}
        </span>
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
  const create = trpc.parties.create.useMutation({ onSuccess: onCreated });

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
        {create.error && <p className="text-xs text-red-600">{create.error.message}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => name.trim() && create.mutate({ ideaBankId: bankId, name: name.trim() })}
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
          onCreated={() => { setShowCreate(false); refetch(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

      {!isLoading && !data?.length && (
        <p className="text-sm text-gray-600">No parties yet.</p>
      )}

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
                <span>{party.ballotCount} {party.ballotCount === 1 ? "ballot" : "ballots"}</span>
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

  const { data: ballotList, refetch: refetchBallots } = trpc.ballots.listByParty.useQuery(
    { partyId },
  );
  const { data: parties } = trpc.parties.listByBank.useQuery({ ideaBankId: bankId });
  const party = parties?.find((p) => p.id === partyId);

  const generate = trpc.ballots.generate.useMutation({
    onSuccess: () => { setGenerateError(null); refetchBallots(); },
    onError: (e) => setGenerateError(e.message),
  });

  const close = trpc.parties.close.useMutation({
    onSuccess: () => utils.parties.listByBank.invalidate({ ideaBankId: bankId }),
  });

  const isClosed = party?.status === "closed";

  return (
    <div>
      <button
        onClick={() => router.push(`/admin?bankId=${bankId}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 group"
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to Bank
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {party?.name ?? "Party"}
            </h1>
            {party && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PARTY_STATUS_STYLES[party.status] ?? ""}`}>
                {party.status}
              </span>
            )}
          </div>
          {party && (
            <p className="text-sm text-gray-600 mt-0.5">
              Started {new Date(party.startAt).toLocaleString()}
              {party.endAt && ` · Closed ${new Date(party.endAt).toLocaleString()}`}
            </p>
          )}
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
    </div>
  );
}

// ─── Bank Detail ──────────────────────────────────────────────────────────────

function BankDetail({ bankId }: { bankId: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = trpc.ideaBanks.getById.useQuery({ id: bankId });
  const [showAddForm, setShowAddForm] = useState(false);

  const updateIdea = trpc.ideaBanks.updateIdea.useMutation();
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
            onUpdateCategory={(id, category) => updateIdea.mutate({ id, category })}
            onUpsertTranslation={(ideaId, language, text) =>
              upsertTranslation.mutate({ ideaId, language, text })
            }
          />
        ))}
      </div>

      <div className="my-8 border-t border-gray-200" />
      <PartySection bankId={bankId} />
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
          <BankList />
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
