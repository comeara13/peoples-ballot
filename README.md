# All Our Ideas

A SaaS civic engagement platform for pairwise preference voting. Organizations run campaigns where participants rank ideas by choosing between two at a time — producing statistically reliable collective priorities from large idea sets.

Inspired by the [Vote Equity Project](https://www.voteequity.org) and [allourideas.org](https://allourideas.org) (Matt Salganik, Princeton).

## How it works

Each voter receives a unique ballot of randomly-paired ideas and picks their preference (or "can't decide"). Aggregate scores are computed using a Bayesian win-percentage formula: `(wins + 1) / ((wins + 1) + (losses + 1))`, producing a ranked list that reflects collective priorities.

## Stack

- **Frontend**: React + TypeScript (Next.js)
- **Backend**: Node.js + TypeScript
- **Database**: PostgreSQL
- **Auth**: Clerk
- **Monorepo**

## Status

Early development — soft launch target April 2026.
