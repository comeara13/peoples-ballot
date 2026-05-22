# Tech Debt & Nits

Small items that aren't blocking but are worth cleaning up.

---

## Glossary feature (from PR #16 review)

### `role="dialog" aria-modal="false"` inconsistency
**File:** `apps/web/components/GlossaryPopover.tsx`

`role="dialog"` with `aria-modal="false"` works in most screen reader / browser combos (NVDA+Firefox, JAWS) but is semantically odd — an informational read-only popover isn't really a dialog. `role="region"` + `aria-live="polite"` is cleaner for a non-interactive content panel.

### Stale-state race in glossary term picker
**File:** `apps/web/app/admin/page.tsx` — `addTerm` / `removeTerm` helpers in `IdeaCard`

Both helpers derive the new term list from `idea.glossaryTerms` (the server prop) without waiting for the previous `setIdeaGlossaryTerms` mutation to settle. Rapid add-then-remove (or vice-versa) can silently lose a change because the second call reads the pre-first-call state. The existing tag picker has the same gap. Fix: disable the picker while `setIdeaGlossaryTerms.isPending`, or optimistically update local state.
