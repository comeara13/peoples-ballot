"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toDatetimeLocal, windowStatus, WINDOW_STATUS_STYLES, PARTY_STATUS_STYLES } from "./shared";
import { CollapsibleSection } from "./CollapsibleSection";
import { PartyBrandingSection } from "./PartyBrandingSection";
import { BallotCard } from "./BallotCard";
import { PartySuggestionsSection } from "./SuggestionsSection";
import { PartyTestimonialsSection } from "./TestimonialsSection";

export function PartyDetail({ bankId, partyId }: { bankId: string; partyId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [pairCount, setPairCount] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [startAtOverride, setStartAtOverride] = useState<string | null>(null);
  const [endAtOverride, setEndAtOverride] = useState<string | null>(null);
  const [showWindowSaved, setShowWindowSaved] = useState(false);
  const windowSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (windowSavedTimer.current) clearTimeout(windowSavedTimer.current); }, []);
  const [origin] = useState(() => typeof window !== "undefined" ? window.location.origin : "");

  const { data: ballotList } = trpc.ballots.listByParty.useQuery({ partyId });
  const { data: partiesList } = trpc.parties.listByBank.useQuery({ ideaBankId: bankId });
  const party = partiesList?.find((p) => p.id === partyId);

  const windowStartAt = startAtOverride ?? toDatetimeLocal(party?.startAt ?? null);
  const windowEndAt = endAtOverride ?? toDatetimeLocal(party?.endAt ?? null);

  const generate = trpc.ballots.generate.useMutation({
    onSuccess: () => {
      setGenerateError(null);
      utils.ballots.listByParty.invalidate({ partyId });
    },
    onError: (e) => setGenerateError(e.message),
  });

  const close = trpc.parties.close.useMutation({
    onSuccess: () => utils.parties.listByBank.invalidate({ ideaBankId: bankId }),
  });

  const update = trpc.parties.update.useMutation({
    onSuccess: () => {
      utils.parties.listByBank.invalidate({ ideaBankId: bankId });
      setStartAtOverride(null);
      setEndAtOverride(null);
      if (windowSavedTimer.current) clearTimeout(windowSavedTimer.current);
      setShowWindowSaved(true);
      windowSavedTimer.current = setTimeout(() => setShowWindowSaved(false), 2500);
    },
  });

  const windowDirty =
    party &&
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

  if (!partiesList) return <p className="text-sm text-gray-600 py-8">Loading…</p>;
  if (!party) return <p className="text-sm text-gray-600 py-8">Party not found.</p>;

  const isClosed = party.status === "closed";
  const currentWindowStatus = windowStatus(party);

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
            <h1 className="text-xl font-semibold text-gray-900">{party.name}</h1>
            {party.mode === "always_on" && (
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

      <CollapsibleSection title="Voting Window" defaultOpen={true}>
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="party-window-opens" className="block text-xs text-gray-600 mb-1">Opens</label>
                <input
                  id="party-window-opens"
                  type="datetime-local"
                  value={windowStartAt}
                  onChange={(e) => setStartAtOverride(e.target.value)}
                  disabled={isClosed}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="party-window-closes" className="block text-xs text-gray-600 mb-1">Closes (optional)</label>
                <input
                  id="party-window-closes"
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
                <span role="status" aria-live="polite" className="text-xs text-green-600">
                  {showWindowSaved ? "Saved" : ""}
                </span>
                {update.error && <span className="text-xs text-red-600">{update.error.message}</span>}
              </div>
            )}
        </div>
      </CollapsibleSection>

      {party.mode === "always_on" && (
        <CollapsibleSection title="Shareable URL" defaultOpen={true}>
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <p className="text-xs text-purple-700 mb-2">
              Anyone who visits this link gets a ballot created for them automatically.
              {party.defaultPairCount && ` Each ballot contains ${party.defaultPairCount} pairs.`}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-purple-200 rounded px-2 py-1.5 text-purple-900 overflow-x-auto whitespace-nowrap">
                {origin ? `${origin}/?party=${partyId}` : "Loading…"}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?party=${partyId}`)}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 font-medium shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Branding Override" defaultOpen={false}>
        <PartyBrandingSection key={party.id} party={party} bankId={bankId} isClosed={isClosed} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Ballots"
        defaultOpen={true}
        actions={
          !isClosed && party.mode !== "always_on" ? (
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
          ) : party.mode === "always_on" ? (
            <p className="text-xs text-gray-500">Ballots are created automatically when voters visit the link.</p>
          ) : undefined
        }
      >
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
      </CollapsibleSection>

      <CollapsibleSection title="Suggested Ideas" defaultOpen={false}>
        <PartySuggestionsSection partyId={partyId} />
      </CollapsibleSection>

      <CollapsibleSection title="Testimonials" defaultOpen={false}>
        <PartyTestimonialsSection partyId={partyId} />
      </CollapsibleSection>
    </div>
  );
}
