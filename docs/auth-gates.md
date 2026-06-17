# Auth Gates

Procedures that need additional protection before production. All `adminProcedure` routes are currently gated on Clerk bearer token with `role === "admin"` in publicMetadata; `publicProcedure` routes have no auth. This file tracks public routes that require extra hardening.

---

## Rate limiting required

### `ballots.createForAlwaysOn`

- **Risk**: Fully public endpoint — no auth, no IP throttling, no CAPTCHA. Anyone who discovers a valid always-on party UUID can create ballots at will, generating unbounded rows in `ballots` and `ballot_pairs`. Ballot generation involves multiple DB writes inside a transaction, making this a meaningful amplification vector.
- **Mitigation needed**: IP-based rate limiting (e.g. via edge middleware or an upstream proxy) before this endpoint is exposed in production.
- **Notes**: Party UUIDs for standard-mode parties are not accepted (returns `NOT_FOUND`), and brute-forcing UUIDs is impractical, but valid always-on URLs are intended to be shared publicly — so the attack surface is real once a URL is distributed.

---

## Clerk auth not yet wired

All `adminProcedure` routes check `isAdmin` from the tRPC context, but Clerk is not yet fully integrated. See `apps/api/src/auth.ts`. Until Clerk is wired end-to-end, the admin gate relies on the bearer token being present in requests — the admin UI enforces this at the client level.
