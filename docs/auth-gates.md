# Auth Gates

Procedures and routes that must be protected once Clerk auth is wired up.
Everything below currently uses `publicProcedure` — no restriction.

## Admin-only (require Clerk `isAdmin` or org role)

| Router | Procedure | Risk |
|--------|-----------|------|
| `tags` | `create` | Anyone can add to the platform-wide vocabulary |
| `tags` | `archive` | Anyone can hide tags from all pickers |
| `tags` | `unarchive` | Anyone can restore archived tags |
| `ideaBanks` | `create` | Anyone can create a bank |
| `ideaBanks` | `createIdea` | Anyone can add ideas to any bank |
| `ideaBanks` | `setIdeaTags` | Anyone can retag ideas on any bank |
| `ideaBanks` | `upsertTranslation` | Anyone can modify idea text |
| `ideaBanks` | `setIdeaActive` | Anyone can activate/deactivate ideas |
| `parties` | `create` | Anyone can create a party under any bank |
| `parties` | `update` | Anyone can edit party window/settings |
| `affiliations` | `create` | Anyone can add affiliations to any bank |
| `affiliations` | `delete` | Anyone can delete affiliations |
| `assessment` | `createQuestion` | Anyone can add pre-assessment questions |
| `assessment` | `deleteQuestion` | Anyone can remove assessment questions |

## Bank-scoped (require ownership of the idea bank)

Most of the admin procedures above should additionally verify the caller owns
the bank they're acting on, not just that they're authenticated.

## Notes

- Clerk integration is tracked as a future milestone; see `docs/PROJECT_SUMMARY.md`.
- When implementing: add a `protectedProcedure` middleware in `apps/api/src/trpc.ts`
  that verifies the Clerk session, then swap `publicProcedure` → `protectedProcedure`
  (or `adminProcedure`) on each row above.
