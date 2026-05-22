"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PairCard } from "@/components/PairCard";
import { VoterRegistrationForm } from "@/components/VoterRegistrationForm";
import { SuggestIdeaSheet } from "@/components/SuggestIdeaSheet";

import type { Selection, BallotState } from "@/types/ballot";

// ─── Campaign branding header (non-sticky, used on ballot view) ───────────────

function BallotHeader({
  branding,
}: {
  branding: { title: string; subtitle: string | null; headerImageUrl: string | null };
}) {
  if (!branding.title && !branding.subtitle && !branding.headerImageUrl) return null;
  return (
    <div className="bg-white border-b border-gray-100">
      {branding.headerImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.headerImageUrl}
          alt=""
          className="w-full max-h-56 object-cover"
        />
      )}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {branding.title && (
          <h1 className="text-2xl font-bold text-gray-900">{branding.title}</h1>
        )}
        {branding.subtitle && (
          <p className="mt-1 text-gray-600">{branding.subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Campaign landing (ballot ID entry for a specific bank) ───────────────────

type BankBranding = {
  id: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  headerImageUrl: string | null;
};

function CampaignLanding({ bank }: { bank: BankBranding }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    const id = input.trim();
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      setError("Please enter a valid ballot ID (UUID format).");
      return;
    }
    setError("");
    router.push(`/?ballotId=${id}`);
  }

  const displayTitle = bank.title ?? bank.name;

  return (
    <div>
      {bank.headerImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bank.headerImageUrl}
          alt=""
          className="w-full max-h-64 object-cover"
        />
      )}
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">{displayTitle}</h1>
        {bank.subtitle && (
          <p className="mt-2 text-lg text-gray-600">{bank.subtitle}</p>
        )}

        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <label
            htmlFor="ballot-id-input"
            className="block text-base font-semibold text-gray-900 mb-1"
          >
            Enter your ballot ID
          </label>
          <p className="text-sm text-gray-600 mb-4">
            You&apos;ll receive this from the event organizer.
          </p>
          <form onSubmit={handleLoad} className="space-y-3">
            <input
              id="ballot-id-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Start Voting →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Tabbed home view ─────────────────────────────────────────────────────────

function HomeContent() {
  const searchParams = useSearchParams();
  const { data: banks = [], isLoading } = trpc.ideaBanks.list.useQuery();

  const bankParam = searchParams.get("bank");
  // Local state drives tab selection; initialised from the URL param so direct
  // navigation to /?bank=<id> works. Tab switches only update local state + the
  // URL via replaceState so the browser back button is not cluttered.
  const [selectedId, setSelectedId] = useState<string | null>(() => bankParam);

  const selectedBank =
    banks.find((b) => b.id === (selectedId ?? bankParam)) ?? banks[0] ?? null;

  // Sync URL param when no bank is in the URL (first visit) — URL only, no state
  useEffect(() => {
    if (!bankParam && banks.length > 0 && banks[0]) {
      const params = new URLSearchParams(window.location.search);
      params.set("bank", banks[0].id);
      window.history.replaceState(null, "", `/?${params.toString()}`);
    }
  }, [bankParam, banks]);

  function selectBank(id: string) {
    setSelectedId(id);
    const params = new URLSearchParams(window.location.search);
    params.set("bank", id);
    window.history.replaceState(null, "", `/?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!banks.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">No campaigns found.</p>
          <a href="/admin" className="text-sm text-blue-600 hover:underline">
            Go to Admin →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div
          role="tablist"
          aria-label="Campaigns"
          className="max-w-4xl mx-auto px-4 flex items-center overflow-x-auto"
        >
          {banks.map((bank) => (
            <button
              key={bank.id}
              role="tab"
              aria-selected={selectedBank?.id === bank.id}
              onClick={() => selectBank(bank.id)}
              className={[
                "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                selectedBank?.id === bank.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              {bank.name}
            </button>
          ))}
        </div>
      </nav>

      {selectedBank && <CampaignLanding key={selectedBank.id} bank={selectedBank} />}
    </div>
  );
}

// ─── Party window helpers ─────────────────────────────────────────────────────

type WindowState = "open" | "scheduled" | "ended" | "closed";

function getWindowState(
  party:
    | {
        status: string;
        startAt: Date | string;
        endAt: Date | string | null;
      }
    | null
    | undefined,
): WindowState {
  if (!party) return "open";
  if (party.status === "closed") return "closed";
  const now = new Date();
  if (now < new Date(party.startAt)) return "scheduled";
  if (party.endAt && now > new Date(party.endAt)) return "ended";
  return "open";
}

function WindowBanner({
  party,
}: {
  party: { status: string; startAt: Date | string; endAt: Date | string | null } | null | undefined;
}) {
  const state = getWindowState(party);
  if (state === "open") return null;

  const message =
    state === "closed"
      ? "This voting session is closed."
      : state === "scheduled"
        ? `Voting opens ${new Date(party!.startAt).toLocaleString()}.`
        : `Voting ended ${new Date(party!.endAt!).toLocaleString()}.`;

  const styles =
    state === "scheduled"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-gray-50 border-gray-200 text-gray-700";

  return (
    <div className={`border rounded-lg px-4 py-3 text-sm font-medium ${styles}`}>
      {message} This ballot cannot be submitted.
    </div>
  );
}

function WindowFooter({
  party,
}: {
  party: { status: string; startAt: Date | string; endAt: Date | string | null } | null | undefined;
}) {
  if (!party) return null;
  const state = getWindowState(party);
  if (state === "closed" || state === "ended") return null;

  if (!party.endAt) return null;

  return (
    <div className="text-center text-xs text-gray-500 pb-4">
      Voting open{" "}
      {state === "scheduled"
        ? `from ${new Date(party.startAt).toLocaleString()} to ${new Date(party.endAt!).toLocaleString()}`
        : `until ${new Date(party.endAt!).toLocaleString()}`}
    </div>
  );
}

// ─── Read-only results view ───────────────────────────────────────────────────

type BallotPairWithVote = {
  id: string;
  position: number;
  leftIdeaId: string;
  rightIdeaId: string;
  leftText: string;
  rightText: string;
  vote: { selection: string } | null;
};

function ResultsView({ pairs }: { pairs: BallotPairWithVote[] }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 font-medium">
        Ballot submitted — your responses are saved.
      </div>
      {pairs.map((pair) => {
        const sel = pair.vote?.selection;
        const leftWon = sel === "left";
        const rightWon = sel === "right";
        const cantDecide = sel === "cant_decide";

        return (
          <div key={pair.id} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-xs text-gray-500 mb-3">Question {pair.position}</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div
                className={[
                  "flex-1 rounded-lg border-2 p-3 text-sm",
                  leftWon ? "border-blue-500 bg-blue-50 text-blue-900 font-semibold" : "",
                  rightWon ? "border-gray-200 text-gray-400 line-through" : "",
                  cantDecide ? "border-gray-200 text-gray-500" : "",
                  !sel ? "border-gray-200 text-gray-500" : "",
                ].join(" ")}
              >
                {pair.leftText}
              </div>
              <div className="flex items-center justify-center text-xs font-bold text-gray-400">
                OR
              </div>
              <div
                className={[
                  "flex-1 rounded-lg border-2 p-3 text-sm",
                  rightWon ? "border-blue-500 bg-blue-50 text-blue-900 font-semibold" : "",
                  leftWon ? "border-gray-200 text-gray-400 line-through" : "",
                  cantDecide ? "border-gray-200 text-gray-500" : "",
                  !sel ? "border-gray-200 text-gray-500" : "",
                ].join(" ")}
              >
                {pair.rightText}
              </div>
            </div>
            {cantDecide && (
              <div className="mt-2 text-center text-xs text-gray-500">Can&apos;t decide</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Live voting view ─────────────────────────────────────────────────────────

function LiveBallot({ ballotId }: { ballotId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: ballot, isLoading, error } = trpc.ballots.getById.useQuery({ id: ballotId });
  const [state, setState] = useState<BallotState>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const submitMutation = trpc.ballots.submit.useMutation({
    onSuccess: () => utils.ballots.getById.invalidate({ id: ballotId }),
  });

  if (!isLoading && ballot && !ballot.voterId) {
    return (
      <VoterRegistrationForm
        ballotId={ballotId}
        onSuccess={() => utils.ballots.getById.invalidate({ id: ballotId })}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-600">Loading ballot…</p>
      </div>
    );
  }

  if (error || !ballot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error?.message ?? "Ballot not found."}</p>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Try a different ballot ID
          </button>
        </div>
      </div>
    );
  }

  if (submitMutation.isSuccess) {
    const pairsWithVotes = ballot.pairs.map((p) => ({
      ...p,
      vote: state[p.id] ? { selection: state[p.id] } : null,
    }));
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <div className="bg-white border-b border-gray-200 px-4 py-5 sticky top-0 z-10 shadow-sm">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <h1 className="text-base font-semibold text-gray-900">Ballot Submitted</h1>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Change ballot
            </button>
          </div>
        </div>
        <ResultsView pairs={pairsWithVotes} />
      </div>
    );
  }

  if (ballot.voteCount > 0 && ballot.voteCount === ballot.pairs.length) {
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <div className="bg-white border-b border-gray-200 px-4 py-5 sticky top-0 z-10 shadow-sm">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <h1 className="text-base font-semibold text-gray-900">Ballot Results</h1>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Change ballot
            </button>
          </div>
        </div>
        <ResultsView pairs={ballot.pairs} />
      </div>
    );
  }

  const windowState = getWindowState(ballot.party);
  const windowClosed = windowState !== "open";

  const pairs = ballot.pairs.map((p) => ({
    id: p.id,
    left: { id: p.leftIdeaId, text: p.leftText },
    right: { id: p.rightIdeaId, text: p.rightText },
  }));

  const answered = Object.keys(state).length;
  const total = pairs.length;
  const allAnswered = answered === total;

  function handleSelect(pairId: string, selection: Selection) {
    if (windowClosed) return;
    setState((prev) => ({ ...prev, [pairId]: selection }));
  }

  function handleSubmit() {
    submitMutation.mutate({
      ballotId: ballot!.id,
      votes: Object.entries(state).map(([ballotPairId, selection]) => ({
        ballotPairId,
        selection,
      })),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <BallotHeader branding={ballot.branding} />

      <div className="bg-white border-b border-gray-200 px-4 py-5 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-base font-semibold text-gray-900 leading-snug">
            Which idea would best help build a community that works for all of us?
          </h1>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-gray-500 hover:text-gray-700 shrink-0"
          >
            ← Change ballot
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <WindowBanner party={ballot.party} />

        <div className={windowClosed ? "opacity-50 pointer-events-none select-none" : ""}>
          {pairs.map((pair, index) => (
            <div key={pair.id}>
              <PairCard
                pair={pair}
                index={index}
                selection={state[pair.id]}
                onSelect={handleSelect}
              />
              {index < pairs.length - 1 && (
                <div className="border-t border-dashed border-gray-300" />
              )}
            </div>
          ))}
        </div>

        {!windowClosed && (
          <div className="border border-gray-200 rounded-lg p-4 bg-white text-center">
            <p className="text-sm text-gray-600 mb-3">Have an idea of your own?</p>
            <button
              onClick={() => setSheetOpen(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Submit Your Own Idea →
            </button>
          </div>
        )}

        <WindowFooter party={ballot.party} />
      </div>

      <SuggestIdeaSheet
        ballotId={ballotId}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{answered}</span>
            {" / "}
            {total} answered
            {!allAnswered && !windowClosed && (
              <span className="ml-2 text-amber-600 text-xs">({total - answered} remaining)</span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitMutation.isPending || windowClosed}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            {submitMutation.isPending ? "Submitting…" : "Submit Ballot"}
          </button>
        </div>
        {submitMutation.error && (
          <p className="text-xs text-red-600 text-center mt-1">{submitMutation.error.message}</p>
        )}
      </div>
    </div>
  );
}

// ─── Page router ──────────────────────────────────────────────────────────────

function BallotPageContent() {
  const searchParams = useSearchParams();
  const ballotId = searchParams.get("ballotId");

  if (!ballotId) return <HomeContent />;
  return <LiveBallot ballotId={ballotId} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-600">Loading…</p>
        </div>
      }
    >
      <BallotPageContent />
    </Suspense>
  );
}
