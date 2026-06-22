"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

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

export function BankList() {
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
