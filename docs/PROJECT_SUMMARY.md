# Project Summary

## What we're building

All Our Ideas is a SaaS civic engagement platform that lets organizations run structured preference-voting campaigns. The core mechanic is pairwise comparison: participants choose between two randomly-paired ideas at a time, and the aggregate of thousands of choices produces a statistically reliable ranked list of collective priorities.

The project is directly inspired by the **Vote Equity Project** (Chicago 2019), which used this method to rank 186 community-submitted ideas for racial equity across 2,126 participants and 52,271 votes. That project used paper ballots (20 pairs per ballot) and the allourideas.org platform (online, up to 100 pairs). We are building a digital-first version of that experience.

The underlying methodology comes from **allourideas.org**, developed by Princeton Professor Matt Salganik. Key academic reference: Salganik & Levy (2015), "Wiki Surveys: Open and Quantifiable Social Data Collection," PLoS ONE.

## Scoring

Score = `(wins + 1) / ((wins + 1) + (losses + 1))`

This is a Bayesian win probability — the expected probability that an idea beats a randomly chosen opponent for a randomly chosen voter. A score of 0.80 means the idea wins 80 out of 100 matchups. The `+1` terms are beta distribution priors, ensuring new ideas start at 0.5. "I can't decide" votes are excluded from wins/losses.

This formula correlates >0.99 with the Glicko strength-of-schedule method, so the simpler formula is sufficient.

## Key product concepts

**Campaign**: A top-level organizing unit for a client (e.g. a city, nonprofit, research org). Has a question ("Which idea would best help build X?"), an Answer Bank, and configuration for ballot behavior.

**Answer Bank**: The pool of ideas for a campaign. Each answer has text (multi-language), a category, and a relevance-category. Ideas can be Policy (what government should do) or Structural (how government should function) — and should only be paired within their category. Answer banks evolve over time; newer ideas need to be oversampled in ballot generation to reach statistical significance.

**Party**: A hosted voting event within a campaign (e.g. a community meeting, a facilitated breakout session). Hosts get a code or link; participants enter the code to unlock their ballot. Ballots are locked until the host closes the voting window.

**Ballot**: A unique set of randomly-paired ideas assigned to one participant. No two participants see the same pairs. Default: 20 pairs. Participants can request additional ballots.

**Vote**: A single pairwise choice — left idea, right idea, result (left / right / can't decide).

## Data model (draft — expected to evolve)

```
Campaign
  └── AnswerBank
        └── Answer (text, category, language)
  └── Party
        └── Ballot (unique per participant)
              └── Vote (pair + result)
  └── Participant (zip code, district, optional PII)
```

## User tracking & PII

- Zip code collected by default; district (local/county/state/federal) derived server-side from Census ZCTA mappings — no user input needed beyond zip.
- Full PII (name, email, address) collected by default; clients may configure what's required.
- No individual voter responses made public; results shared in aggregate only.
- Civic trust survey (pre/post questions) is a planned feature.

## SaaS model

One platform, multiple client campaigns. Clients have different "user profiles" and feature sets (tiered). The platform needs to be configurable per campaign (question text, answer bank, ballot size, vote limits, district levels, language).

## MVP scope (soft launch April 2026)

- Ballot experience (pairwise voting UI)
- Vote tracking and scoring
- Participant identity (Clerk auth, zip code collection)
- Basic campaign + answer bank management

Not in MVP: paper ballot export, civic trust survey, party host flow, small group IDs.

Hard launch target: June 2026.

## Team

- **Chris O'Meara** — tech lead
- **Niketa** — co-founder, product/strategy
- **Jianan Shi** — product/strategy

## References

- Vote Equity Project: https://www.voteequity.org
- Original methodology: Salganik & Levy (2015) https://doi.org/10.1371/journal.pone.0123483
- All Our Ideas platform: https://all-our-ideas.citizens.is
