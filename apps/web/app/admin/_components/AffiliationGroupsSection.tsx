"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function AffiliationGroupsSection({ ideaBankId }: { ideaBankId: string }) {
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
