# Claude Code Guide

## Project overview

All Our Ideas is a SaaS pairwise preference-voting platform. See `docs/PROJECT_SUMMARY.md` for full context, domain background, and product nuances.

## Stack

- **Monorepo**: `apps/web` (Next.js 16 App Router, Tailwind v4), `apps/api` (Bun + tRPC v11)
- **Database**: PostgreSQL (Docker locally on port 5433; Neon/Supabase in prod)
- **Auth**: Clerk (not yet wired up)
- **Language**: TypeScript throughout
- **Hosting**: Render or Railway (budget target: <$100/mo)
- **Static export**: `output: 'export'` in next.config.ts — no dynamic route segments, use query params

## Domain concepts

- **Pairwise comparison**: each ballot shows N randomly-paired ideas; voter picks one or "can't decide"
- **Answer Bank**: pool of ideas for a campaign — each answer has text (multi-language), category, relevance-category; newer ideas are oversampled in ballot generation
- **Scoring formula**: `(wins + 1) / ((wins + 1) + (losses + 1))` — Bayesian win probability (same as allourideas.org); "can't decide" excluded from wins/losses
- **Ballot lock**: ballots locked until host closes the voting window
- **District mapping**: zip code → local/county/state/federal district resolved server-side via Census data, not user input

## Data model

Current schema in `apps/api/src/db/schema.ts` (Drizzle + PostgreSQL):

```
idea_banks
  id, name, created_at

ideas
  id, idea_bank_id → idea_banks (cascade), category (optional), is_active
  wins int DEFAULT 0, losses int DEFAULT 0
  score float DEFAULT 50.0  ← (wins+1)/(wins+losses+2)*100, recomputed on each vote
  created_at

idea_translations
  id, idea_id → ideas (cascade), language ('en'|'es'|...), text
  UNIQUE (idea_id, language)

prompts
  id, idea_bank_id → idea_banks (cascade), left_idea_id → ideas, right_idea_id → ideas
  votes_count int DEFAULT 0  ← drives catchup sampling weight: min(1/(votes_count+1), 0.05)
  created_at
  UNIQUE (idea_bank_id, left_idea_id, right_idea_id)
  CHECK left_idea_id < right_idea_id  ← canonical UUID-lex ordering; ballot_pairs may flip for display

ballots
  id, idea_bank_id → idea_banks, status ('pending'|'in_progress'|'submitted'), created_at, submitted_at

ballot_pairs
  id, ballot_id → ballots (cascade), prompt_id → prompts, position
  left_idea_id → ideas, right_idea_id → ideas  ← denormalized; may differ from prompt's canonical order

votes
  id, ballot_pair_id → ballot_pairs (cascade), selection ('left'|'right'|'cant_decide'), created_at
  (cant_decide excluded from wins/losses; all selections increment prompt.votes_count)
```

No campaigns, parties, or participants in current scope.

## Ballot generation algorithm (catchup)

Adapted from allourideas.org pairwise-api. For each idea bank:

1. Fetch all existing `prompts` for the bank + their `votes_count`
2. Enumerate all valid pairs from active ideas — canonical order enforced (`left < right` UUID-lex)
3. Assign weight per pair: `min(1 / (votes_count + 1), tau)` where `tau = 0.05`
   - Pairs with < 20 votes all get equal weight `tau` (new ideas naturally oversampled)
   - Pairs with ≥ 20 votes are down-weighted proportionally
4. Normalize weights to sum 1.0; weighted random sample N pairs without replacement
5. Upsert prompt rows for any newly seen pairs
6. Create ballot + ballot_pairs (randomly flip left/right for each pair at display time)

On vote (non-skip): increment `prompt.votes_count`, update `idea.wins`/`idea.losses`/`idea.score`.

## Accessibility

- Target: **WCAG 2.1 AA** throughout
- Tailwind v4 gray palette on white (#ffffff): `gray-400` = 2.60:1 (FAIL), `gray-500` = 4.84:1 (PASS)
- **Minimum for body text**: `text-gray-500`. Prefer `text-gray-600` for secondary/meta text
- Never use `text-gray-300` or `text-gray-400` for readable text — reserved for decorative borders only

## Database migrations

Always use Drizzle-kit — never write migration SQL by hand or edit `drizzle/meta/_journal.json` directly.

```bash
# After changing apps/api/src/db/schema.ts:
cd apps/api
bun run db:generate   # creates SQL file + journal entry
bun run db:migrate    # applies pending migrations to the local DB
```

`db:generate` requires a TTY — run it via `expect` when invoked from a script:
```bash
expect -c 'spawn bun run db:generate; expect eof'
```

Hand-written SQL files will be ignored by `drizzle-kit migrate` because they have no journal entry, leading to silent drift between the schema and the DB.

### Snapshot baseline

`drizzle/meta/` must contain a snapshot for the latest migration index so drizzle-kit diffs correctly. If snapshots are missing (0002–0006 were hand-written and have no snapshots), regenerate the baseline:

```bash
# 1. Reset local DB to a clean state by applying all migrations directly:
psql postgresql://postgres:postgres@localhost:5433/postgres -c "DROP DATABASE IF EXISTS all_our_ideas;"
psql postgresql://postgres:postgres@localhost:5433/postgres -c "CREATE DATABASE all_our_ideas;"
for sql in apps/api/drizzle/000*.sql; do
  psql postgresql://postgres:postgres@localhost:5433/all_our_ideas -f "$sql"
done

# 2. Introspect the clean DB to get a ground-truth snapshot:
bunx drizzle-kit introspect \
  --dialect postgresql \
  --url postgresql://postgres:postgres@localhost:5433/all_our_ideas \
  --out /tmp/drizzle-introspect

# 3. Fix the snapshot IDs so it chains correctly, then copy it as the latest snapshot:
python3 - <<'PY'
import json, uuid
LATEST_IDX = 7   # update to the current highest migration index
PREV_ID = "80a47b20-0ea0-4be4-9730-9d3d6622f66d"  # ID of the previous known snapshot
snap = json.load(open("/tmp/drizzle-introspect/meta/0000_snapshot.json"))
snap["prevId"] = PREV_ID
snap["id"] = str(uuid.uuid4())
out = f"apps/api/drizzle/meta/{LATEST_IDX:04d}_snapshot.json"
json.dump(snap, open(out, "w"), indent=2)
print("Wrote", out)
PY

# 4. Now db:generate will diff from the correct baseline:
cd apps/api && expect -c 'spawn bun run db:generate; expect eof'
```

**Note:** The `_journal.json` file must be valid JSON (no trailing commas). Linters may add trailing commas — validate with `python3 -c "import json; json.load(open('apps/api/drizzle/meta/_journal.json'))"` before running generate.

## Git authentication

The remote is `https://github.com/comeara13/all-our-ideas.git`. Plain `git push origin` will fail because the shell has no stored credentials. Embed the `gh` token directly in the URL:

```bash
TOKEN=$(gh auth token)
GH_USER=$(gh api user --jq .login)
git push "https://${GH_USER}:${TOKEN}@github.com/comeara13/all-our-ideas.git" <branch>
```

Same pattern for `git pull`, `git fetch`, or any other git network command:

```bash
git fetch "https://${GH_USER}:${TOKEN}@github.com/comeara13/all-our-ideas.git"
```

For `gh` CLI commands (PR create, view, diff, etc.) set `GITHUB_TOKEN` instead:

```bash
GITHUB_TOKEN=$(gh auth token) gh pr view 9 --repo comeara13/all-our-ideas
```

## Auth

Clerk is not yet wired up. Every tRPC procedure currently uses `publicProcedure` with no access control. `docs/auth-gates.md` lists every procedure that must be protected before production — consult it when adding new procedures or reviewing existing ones.

## Key constraints

- No paper ballot export (not in MVP or near-term scope)
- PII collected by default; results always shared in aggregate only
- Private repo; may be open-sourced later — avoid hardcoding secrets or internal assumptions
