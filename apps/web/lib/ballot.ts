/** Returns true when the string matches the word-code format (e.g. "brave-golden-river"). */
export function isBallotAccessCode(value: string): boolean {
  return /^[a-z]+-[a-z]+-[a-z]+$/.test(value);
}
