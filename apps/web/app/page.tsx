"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PairCard } from "@/components/PairCard";
import { VoterRegistrationForm } from "@/components/VoterRegistrationForm";
import { SuggestIdeaSheet } from "@/components/SuggestIdeaSheet";
import { ShareStorySheet } from "@/components/ShareStorySheet";
import { isBallotAccessCode } from "@/lib/ballot";

import Markdown from "react-markdown";

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
          <div className="mt-1 text-gray-600 prose prose-sm max-w-none">
            <Markdown
              components={{
                a: ({ ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
              }}
            >
              {branding.subtitle}
            </Markdown>
          </div>
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
  const { isLoaded } = useAuth();
  const router = useRouter();
  const ballotInputId = useId();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return; // clerk-js URL cleanup must finish before we navigate (snap-back bug)
    const id = input.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isCode = isBallotAccessCode(id);
    if (!isUuid && !isCode) {
      setError("Please enter a valid ballot ID or access code (e.g. brave-golden-river).");
      return;
    }
    setError("");
    const normalized = isCode ? id.toLowerCase() : id;
    router.push(`/?ballotId=${encodeURIComponent(normalized)}`);
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
            htmlFor={ballotInputId}
            className="block text-base font-semibold text-gray-900 mb-1"
          >
            Enter your ballot ID
          </label>
          <p className="text-sm text-gray-600 mb-4">
            You&apos;ll receive this from the event organizer.
          </p>
          <form onSubmit={handleLoad} className="space-y-3">
            <input
              id={ballotInputId}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="xxxxxxxx-xxxx-… or brave-golden-river"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!isLoaded}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoaded ? "Start Voting →" : "Loading…"}
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

// OMB SPD-15 (March 2024) — multi-select; "prefer_not_to_say" is mutually exclusive.
const RACE_ETHNICITY_OPTIONS = [
  { value: "white", label: "White" },
  { value: "black_african_american", label: "Black or African American" },
  { value: "american_indian_alaska_native", label: "American Indian or Alaska Native" },
  { value: "asian", label: "Asian" },
  { value: "native_hawaiian_pacific_islander", label: "Native Hawaiian or Pacific Islander" },
  { value: "middle_eastern_north_african", label: "Middle Eastern or North African" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non Binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => CURRENT_YEAR - i);

// ─── Post-vote survey ─────────────────────────────────────────────────────────

function PostVoteSurvey({
  ballotId,
  votes,
  postVoteMessage,
  onComplete,
}: {
  ballotId: string;
  votes: { ballotPairId: string; selection: "left" | "right" | "cant_decide" }[];
  postVoteMessage: string;
  onComplete: () => void;
}) {
  const { data: questions = [], isLoading } = trpc.assessment.listQuestionsForBallot.useQuery(
    { ballotId, stage: "post" },
  );
  const [raceCategories, setRaceCategories] = useState<string[]>([]);
  const [birthYear, setBirthYear] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerError, setAnswerError] = useState<string | null>(null);
  const submit = trpc.ballots.submit.useMutation({ onSuccess: onComplete });

  function toggleRaceCategory(value: string) {
    setRaceCategories((prev) => {
      if (value === "prefer_not_to_say") {
        return prev.includes("prefer_not_to_say") ? [] : ["prefer_not_to_say"];
      }
      const withoutPnts = prev.filter((v) => v !== "prefer_not_to_say");
      return prev.includes(value)
        ? withoutPnts.filter((v) => v !== value)
        : [...withoutPnts, value];
    });
  }

  const allAnswered =
    raceCategories.length > 0 &&
    birthYear !== "" &&
    gender !== "" &&
    (questions.length === 0 || questions.every((q) => answers[q.id] !== undefined));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) {
      setAnswerError("Please answer all questions before submitting.");
      return;
    }
    submit.mutate({
      ballotId,
      votes,
      raceEthnicityCategories: raceCategories as (typeof RACE_ETHNICITY_OPTIONS)[number]["value"][],
      birthYear: birthYear === "prefer_not_to_say" ? null : Number(birthYear),
      gender: gender as (typeof GENDER_OPTIONS)[number]["value"],
      surveyResponses: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-4">
          <p className="text-lg font-semibold text-gray-900">{postVoteMessage}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Race / Ethnicity — collected post-vote, above assessment questions */}
          <fieldset>
            <legend className="text-base font-semibold text-gray-900 mb-1">Race / Ethnicity</legend>
            <p className="text-xs text-gray-500 mb-3">
              Select all that apply. &ldquo;Prefer not to say&rdquo; is mutually exclusive.
            </p>
            <div className="space-y-2">
              {RACE_ETHNICITY_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={raceCategories.includes(option.value)}
                    onChange={() => toggleRaceCategory(option.value)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Birth year */}
          <fieldset>
            <legend className="text-base font-semibold text-gray-900 mb-3">Year of Birth</legend>
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select year…</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
              {BIRTH_YEARS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </fieldset>

          {/* Gender */}
          <fieldset>
            <legend className="text-base font-semibold text-gray-900 mb-3">Gender</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Gender">
              {GENDER_OPTIONS.map((option) => {
                const selected = gender === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setGender(option.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {!isLoading && questions.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-gray-900">A few quick questions</h2>

              {questions.map((q) => (
                <div key={q.id}>
                  <p className="text-sm text-gray-800 mb-3">{q.text}</p>
                  {q.type === "likert" ? (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-2 px-1">
                        <span>Strongly Disagree</span>
                        <span>Strongly Agree</span>
                      </div>
                      <div className="flex gap-2" role="radiogroup" aria-label={q.text}>
                        {["1", "2", "3", "4", "5"].map((val) => {
                          const selected = answers[q.id] === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => {
                                setAnswers((prev) => ({ ...prev, [q.id]: val }));
                                setAnswerError(null);
                              }}
                              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                selected
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3" role="radiogroup" aria-label={q.text}>
                      {["yes", "no"].map((val) => {
                        const selected = answers[q.id] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [q.id]: val }));
                              setAnswerError(null);
                            }}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize ${
                              selected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {answerError && (
            <p role="alert" className="text-xs text-red-600">{answerError}</p>
          )}
          {submit.error && (
            <p role="alert" className="text-xs text-red-600">{submit.error.message}</p>
          )}

          <button
            type="submit"
            disabled={!allAnswered || submit.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {submit.isPending ? "Submitting…" : "Submit Survey"}
          </button>
        </form>

      </div>
    </div>
  );
}

// ─── Live voting view ─────────────────────────────────────────────────────────

function LiveBallot({ ballotId }: { ballotId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isCode = isBallotAccessCode(ballotId);
  const byId = trpc.ballots.getById.useQuery({ id: ballotId }, { enabled: !isCode });
  const byCode = trpc.ballots.getByCode.useQuery({ code: ballotId }, { enabled: isCode });
  const { data: ballot, isLoading, error } = isCode ? byCode : byId;

  function invalidateBallot() {
    if (isCode) utils.ballots.getByCode.invalidate({ code: ballotId });
    else utils.ballots.getById.invalidate({ id: ballotId });
  }

  const [state, setState] = useState<BallotState>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [storySheetOpen, setStorySheetOpen] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyDone, setSurveyDone] = useState(false);

  if (!isLoading && ballot && !ballot.voterId) {
    return (
      <VoterRegistrationForm
        ballotId={ballot.id}
        onSuccess={invalidateBallot}
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

  if (showSurvey && !surveyDone) {
    const votes = Object.entries(state).map(([ballotPairId, selection]) => ({
      ballotPairId,
      selection: selection as "left" | "right" | "cant_decide",
    }));
    return (
      <PostVoteSurvey
        ballotId={ballot.id}
        votes={votes}
        postVoteMessage={ballot.postVoteMessage ?? "Thank you for voting!"}
        onComplete={() => { setSurveyDone(true); invalidateBallot(); }}
      />
    );
  }

  if (surveyDone) {
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
    left: { id: p.leftIdeaId, text: p.leftText, glossaryTerms: p.leftGlossaryTerms ?? [] },
    right: { id: p.rightIdeaId, text: p.rightText, glossaryTerms: p.rightGlossaryTerms ?? [] },
  }));

  const answered = Object.keys(state).length;
  const total = pairs.length;
  const allAnswered = answered === total;

  function handleSelect(pairId: string, selection: Selection) {
    if (windowClosed) return;
    setState((prev) => ({ ...prev, [pairId]: selection }));
  }

  function handleSubmit() {
    setShowSurvey(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <BallotHeader branding={ballot.branding} />

      {ballot.branding.questionHeading && (
        <div className="bg-white border-b border-gray-200 px-4 py-5 sticky top-0 z-10 shadow-sm">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-gray-900 leading-snug">
              {/* allowedElements + unwrapDisallowed keeps only inline nodes,
                  preventing block elements (lists, headings, pre) from being
                  nested inside <h2> and producing invalid HTML. */}
              <Markdown
                allowedElements={["strong", "em", "a", "code", "del"]}
                unwrapDisallowed
                components={{
                  a: ({ ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
                }}
              >
                {ballot.branding.questionHeading}
              </Markdown>
            </h2>
            <button
              onClick={() => router.push("/")}
              className="text-xs text-gray-500 hover:text-gray-700 shrink-0"
            >
              ← Change ballot
            </button>
          </div>
        </div>
      )}

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

        <WindowFooter party={ballot.party} />
      </div>

      <SuggestIdeaSheet
        ballotId={ballot.id}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />

      <ShareStorySheet
        ballotId={ballot.id}
        open={storySheetOpen}
        onClose={() => setStorySheetOpen(false)}
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!windowClosed && (
              <button
                onClick={() => setStorySheetOpen(true)}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Share your story
              </button>
            )}
            {!windowClosed && (
              <button
                onClick={() => setSheetOpen(true)}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Submit Idea
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || windowClosed}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
            >
              Submit Ballot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Always-on party entry (ballot created on demand) ─────────────────────────

function AlwaysOnEntry({ partyId }: { partyId: string }) {
  const [ballotId, setBallotId] = useState<string | null>(null);
  const fired = useRef(false);
  const createMutation = trpc.ballots.createForAlwaysOn.useMutation({
    onSuccess: (ballot) => setBallotId(ballot.id),
  });

  // Fire once on mount. The `key={partyId}` on the call site remounts this component
  // when partyId changes, so the ref + empty dep array is correct — no stale closure.
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    createMutation.mutate({ partyId });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (ballotId) return <LiveBallot ballotId={ballotId} />;

  if (createMutation.isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{createMutation.error?.message ?? "Unable to create ballot."}</p>
          <button
            onClick={() => createMutation.mutate({ partyId })}
            className="text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-600">Setting up your ballot…</p>
    </div>
  );
}

// ─── Page router ──────────────────────────────────────────────────────────────

function BallotPageContent() {
  const searchParams = useSearchParams();
  const partyId = searchParams.get("party");
  const ballotId = searchParams.get("ballotId");

  if (partyId) return <AlwaysOnEntry key={partyId} partyId={partyId} />;
  if (ballotId) return <LiveBallot ballotId={ballotId} />;
  return <HomeContent />;
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
