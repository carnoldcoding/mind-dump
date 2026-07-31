# Branching Strategy

Trunk-based development with short-lived branches. Adopted 2026-07-03, replacing an ad-hoc history of long-lived feature branches that accumulated unmerged for months (`dev`, `game-reviews`, `legacy-no-ai`, `react-refactor`, `refactor-mvvm`, `routing`, `ai-refactor` — all pruned when this strategy was established; the one real unmerged change on `ai-refactor` was cherry-picked into `main` first).

## Rules

- **`main` is always deployable.** Every change, regardless of size or who/what authors it (you or an agent), goes through a branch + PR. No direct pushes — this is enforced by GitHub branch protection on `main`, including for admins. No exceptions, so there's no judgment call about what counts as "trivial enough" to skip.
- **Branch naming**: `<type>/<short-kebab-description>`, e.g. `feat/journal-page`, `fix/audio-player-seek`, `chore/dep-updates`. Types: `feat`, `fix`, `chore`, `refactor`, `docs`.
- **Merge strategy**: merge commit only. Squash and rebase merge are disabled at the repo level. This is deliberate — we want the full intermediate commit trail preserved on `main` (including an agent's "tried X, reverted, did Y" reasoning), not flattened into one commit.
- **Commits must be atomic and meaningful on their own** — imperative mood subject ("Add X", not "Added X"), body explains *why* when it's non-obvious. No "wip"/"checkpoint"/"fix typo from last commit" commits — if you're iterating, clean up with `git commit --amend` or an interactive rebase before pushing/opening the PR, so the trail that lands is already the real story.
- **Merged branches are auto-deleted** (repo setting) — don't rely on branches sticking around after merge.

## Workflow

1. Branch off latest `main` using the naming convention above.
2. Do the work, with clean atomic commits.
3. When an agent finishes a branch, it opens the PR itself (`gh pr create`) with a description following the template below, then stops — it does not merge on its own.
4. You review and merge (or send it back for changes).

## PR description convention

No enforced GitHub PR template — just this shape, by convention:

```
## Summary
- What changed, 1-3 bullets

## Why
Motivation / context for the change

## Test plan (optional)
How this was verified
```

## Gates

Manual review is currently the only gate — no CI, no required status checks. Docker (local dev via `docker-compose.yml` in `mind-dump-fullstack`) and a test setup (Vitest) both now exist, but automated checks (lint/build/tests as required status checks) still haven't been wired up as CI.
