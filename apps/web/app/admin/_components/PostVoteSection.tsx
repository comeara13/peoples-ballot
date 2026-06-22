"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export function PostVoteSection({ bank }: { bank: { id: string; postVoteMessage: string | null } }) {
  const utils = trpc.useUtils();
  const [message, setMessage] = useState(bank.postVoteMessage ?? "");
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  const [prevMessage, setPrevMessage] = useState(bank.postVoteMessage);
  if (bank.postVoteMessage !== prevMessage) {
    setPrevMessage(bank.postVoteMessage);
    setMessage(bank.postVoteMessage ?? "");
  }

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
