export type BrandingSource = {
  name: string;
  title: string | null;
  subtitle: string | null;
  headerImageUrl: string | null;
  questionHeading: string | null;
};

export type ResolvedBranding = {
  title: string;
  subtitle: string | null;
  headerImageUrl: string | null;
  questionHeading: string | null;
};

const nb = (s: string | null | undefined): string | null => s?.trim() || null;

export function resolveBranding(
  ideaBank: BrandingSource,
  party: Omit<BrandingSource, "name"> | null,
): ResolvedBranding {
  return {
    title: nb(party?.title) ?? nb(ideaBank.title) ?? nb(ideaBank.name) ?? "Untitled",
    subtitle: nb(party?.subtitle) ?? nb(ideaBank.subtitle),
    headerImageUrl: nb(party?.headerImageUrl) ?? nb(ideaBank.headerImageUrl),
    questionHeading: nb(party?.questionHeading) ?? nb(ideaBank.questionHeading),
  };
}
