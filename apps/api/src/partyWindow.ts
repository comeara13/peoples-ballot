export type WindowResult =
  | { ok: true }
  | { ok: false; reason: "closed" | "not_started" | "ended"; message: string };

export function checkPartyWindow(
  party: { status: string; startAt: Date; endAt: Date | null },
  now: Date = new Date(),
): WindowResult {
  if (party.status === "closed")
    return { ok: false, reason: "closed", message: "This party is closed." };
  if (now < party.startAt)
    return { ok: false, reason: "not_started", message: "Voting has not started yet." };
  if (party.endAt !== null && now > party.endAt)
    return { ok: false, reason: "ended", message: "Voting window has closed." };
  return { ok: true };
}
