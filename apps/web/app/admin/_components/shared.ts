import type { RouterOutput } from "@/lib/trpc";

export type BrandingFieldSet = {
  title: string | null;
  subtitle: string | null;
  headerImageUrl: string | null;
  questionHeading: string | null;
};

export const LANGUAGES = ["en", "es", "fr", "pt", "zh"] as const;
export type Language = (typeof LANGUAGES)[number];

export function toDatetimeLocal(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function windowStatus(party: {
  startAt: Date | string;
  endAt: Date | string | null;
  status: string;
}) {
  if (party.status === "closed") return "closed" as const;
  const now = new Date();
  if (now < new Date(party.startAt)) return "scheduled" as const;
  if (party.endAt && now > new Date(party.endAt)) return "ended" as const;
  return "open" as const;
}

export const WINDOW_STATUS_STYLES = {
  open: "bg-green-100 text-green-700",
  scheduled: "bg-amber-100 text-amber-700",
  ended: "bg-gray-100 text-gray-600",
  closed: "bg-gray-100 text-gray-600",
} as const;

export const SUGGESTION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  merged: "bg-blue-100 text-blue-700",
};

export const PARTY_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export const TAG_TYPE_STYLES: Record<string, string> = {
  issue_category: "bg-indigo-100 text-indigo-700",
  scale: "bg-teal-100 text-teal-700",
};

export type Tag = RouterOutput["tags"]["list"][number];
export type GlossaryTerm = RouterOutput["glossary"]["list"][number];

export type Translation = { id: string; ideaId: string; language: string; text: string };
export type Idea = {
  id: string;
  isActive: boolean;
  wins: number;
  losses: number;
  score: number;
  voteCount: number;
  createdAt: Date | string;
  translations: Translation[];
  tags: Tag[];
  glossaryTerms: GlossaryTerm[];
};

export type SuggestionRow = {
  id: string;
  text: string;
  tags: Tag[];
  status: string;
  linkedIdeaCount: number;
  createdAt: Date | string;
  voterFirstName: string | null;
  voterLastName: string | null;
  partyName?: string | null;
};
