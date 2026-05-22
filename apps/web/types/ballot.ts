export interface GlossaryTerm {
  id: string;
  title: string;
  body: string;
}

export interface Idea {
  id: string;
  text: string;
  glossaryTerms: GlossaryTerm[];
}

export interface Pair {
  id: string;
  left: Idea;
  right: Idea;
}

export type Selection = "left" | "right" | "cant_decide";
export type BallotState = Record<string, Selection>;
