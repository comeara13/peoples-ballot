"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { AdminGuard } from "@/components/AdminGuard";

// ─── Term row ─────────────────────────────────────────────────────────────────

type Term = {
  id: string;
  title: string;
  body: string;
  archivedAt: Date | string | null;
  createdAt: Date | string;
};

function GlossaryTermRow({ term, onArchive, onUnarchive, onUpdate }: {
  term: Term;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onUpdate: (id: string, title: string, body: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(term.title);
  const [editBody, setEditBody] = useState(term.body);
  const archived = Boolean(term.archivedAt);

  function handleSave() {
    if (editTitle.trim() && editBody.trim()) {
      onUpdate(term.id, editTitle.trim(), editBody.trim());
      setEditing(false);
    }
  }

  function handleCancel() {
    setEditTitle(term.title);
    setEditBody(term.body);
    setEditing(false);
  }

  if (archived) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-dashed border-gray-200 bg-gray-50">
        <span className="text-sm text-gray-400 line-through">{term.title}</span>
        <button
          onClick={() => onUnarchive(term.id)}
          className="text-xs text-gray-500 hover:text-green-700 font-medium ml-4"
        >
          Restore
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {editing ? (
        <div className="p-4 space-y-3">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Term title…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            placeholder="Definition (Markdown)…"
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!editTitle.trim() || !editBody.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{term.title}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{term.body}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1"
              >
                Edit
              </button>
              <button
                onClick={() => onArchive(term.id)}
                className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded px-2 py-1"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function GlossaryContent() {
  const utils = trpc.useUtils();
  const { data: allTerms, isLoading } = trpc.glossary.list.useQuery({ includeArchived: true });
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const createMutation = trpc.glossary.create.useMutation({
    onSuccess: () => {
      setNewTitle("");
      setNewBody("");
      setCreateError(null);
      setShowCreate(false);
      utils.glossary.list.invalidate();
    },
    onError: (err) => setCreateError(err.message),
  });

  const updateMutation = trpc.glossary.update.useMutation({
    onSuccess: () => utils.glossary.list.invalidate(),
  });

  const archiveMutation = trpc.glossary.archive.useMutation({
    onSuccess: () => utils.glossary.list.invalidate(),
  });

  const unarchiveMutation = trpc.glossary.unarchive.useMutation({
    onSuccess: () => utils.glossary.list.invalidate(),
  });

  const activeTerms = allTerms?.filter((t) => !t.archivedAt) ?? [];
  const archivedTerms = allTerms?.filter((t) => t.archivedAt) ?? [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-800 font-medium"
          >
            ← Back to Admin
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Glossary Terms</h1>
            <p className="text-sm text-gray-500 mt-1">
              Platform-wide definitions shown to voters as contextual popovers. Supports Markdown.
            </p>
          </div>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium shrink-0"
            >
              + New Term
            </button>
          )}
        </div>

        {showCreate && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
            <p className="text-sm font-semibold text-gray-800">New glossary term</p>
            <input
              value={newTitle}
              onChange={(e) => { setNewTitle(e.target.value); setCreateError(null); }}
              placeholder="Term title (e.g. Tax Increment Financing)"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Definition (Markdown supported)…"
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
            />
            {createError && <p className="text-xs text-red-600">{createError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newTitle.trim() && newBody.trim()) {
                    createMutation.mutate({ title: newTitle.trim(), body: newBody.trim() });
                  }
                }}
                disabled={!newTitle.trim() || !newBody.trim() || createMutation.isPending}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {createMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewTitle("");
                  setNewBody("");
                  setCreateError(null);
                }}
                className="px-3 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-gray-600">Loading…</p>}

        {!isLoading && (
          <div className="space-y-3">
            {activeTerms.length === 0 && !showCreate && (
              <p className="text-sm text-gray-500 italic">
                No glossary terms yet. Create one to start linking definitions to ideas.
              </p>
            )}

            {activeTerms.map((term) => (
              <GlossaryTermRow
                key={term.id}
                term={term}
                onArchive={(id) => archiveMutation.mutate({ id })}
                onUnarchive={(id) => unarchiveMutation.mutate({ id })}
                onUpdate={(id, title, body) => updateMutation.mutate({ id, title, body })}
              />
            ))}

            {archivedTerms.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  {showArchived ? "▾" : "▸"} Archived ({archivedTerms.length})
                </button>
                {showArchived && (
                  <div className="mt-2 space-y-2">
                    {archivedTerms.map((term) => (
                      <GlossaryTermRow
                        key={term.id}
                        term={term}
                        onArchive={(id) => archiveMutation.mutate({ id })}
                        onUnarchive={(id) => unarchiveMutation.mutate({ id })}
                        onUpdate={(id, title, body) => updateMutation.mutate({ id, title, body })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlossaryAdminPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-gray-600">Loading…</div>
          </main>
        }
      >
        <GlossaryContent />
      </Suspense>
    </AdminGuard>
  );
}
