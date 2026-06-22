"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PARTY_STATUS_STYLES } from "./shared";

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

export function PartySection({ bankId }: { bankId: string }) {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.parties.listByBank.useQuery({ ideaBankId: bankId });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      {!showCreate && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium"
          >
            + New Party
          </button>
        </div>
      )}

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
