export type BrandingSource = {
  name: string;
  title: string | null;
  subtitle: string | null;
  headerImageUrl: string | null;
};

export type ResolvedBranding = {
  title: string;
  subtitle: string | null;
  headerImageUrl: string | null;
};

export function resolveBranding(
  ideaBank: BrandingSource,
  party: Omit<BrandingSource, "name"> | null,
): ResolvedBranding {
  return {
    title: party?.title ?? ideaBank.title ?? ideaBank.name,
    subtitle: party?.subtitle ?? ideaBank.subtitle ?? null,
    headerImageUrl: party?.headerImageUrl ?? ideaBank.headerImageUrl ?? null,
  };
}
