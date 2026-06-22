"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function TagManagementSection() {
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
  const [archivePending, setArchivePending] = useState<Set<string>>(new Set());
  const archiveMutation = trpc.tags.archive.useMutation({
    onSuccess: () => utils.tags.list.invalidate(),
  });
  const unarchiveMutation = trpc.tags.unarchive.useMutation({
    onSuccess: () => utils.tags.list.invalidate(),
  });

  function handleArchive(id: string) {
    setArchivePending((prev) => new Set(prev).add(id));
    archiveMutation.mutate(
      { id },
      { onSettled: () => setArchivePending((prev) => { const s = new Set(prev); s.delete(id); return s; }) },
    );
  }

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
                      onClick={() => handleArchive(tag.id)}
                      disabled={archivePending.has(tag.id)}
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
