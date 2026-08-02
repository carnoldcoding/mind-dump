# Branching Strategy

`main` is release-only. `dev` is the trunk. Work happens on short-lived
branches off `dev`, and reaches `main` only through a release branch.

Adopted 2026-08-02, replacing the trunk-based model in place since 2026-07-03,
which itself replaced an ad-hoc history of long-lived feature branches.

```
  feat/*  fix/*  chore/*        short-lived, off dev, back into dev
        \    |    /
         \   |   /
          v  v  v
  ─────────► dev ──────────────► releases/0.0.1 ──────► main ──► tag v0.0.1
             ▲                         │
             └─────────────────────────┘
                fixes made on a release
                come back to dev
```

## What each branch is for

**`main`** — verified, production-ready, and nothing else. It only ever
receives a merge from a `releases/*` branch. Every commit on it is a release.
If something is on `main`, it has been run and looked at, not merely merged.

**`dev`** — the trunk. Everything integrates here first. `dev` is expected to
be working but not proven; it is where a change is allowed to be *probably*
right.

**`feat/*`, `fix/*`, `chore/*`, `refactor/*`, `docs/*`** — short-lived, branch
off `dev`, merge back into `dev` by PR. One coherent piece of work each. If a
branch has been open long enough to need rebasing twice, it was too big.

**`releases/<major>.<minor>.<patch>`** — cut from `dev` when a set of work is
ready to be verified. Only stabilisation happens on a release branch: fixes for
what verification turns up, and nothing else. No new features. When it is
genuinely ready, it merges into `main` and gets tagged.

Anything fixed on a release branch **must also come back to `dev`**, or the
next release will reintroduce the bug.

## Versioning

`releases/*` follow semantic versioning.

- **patch** (`0.0.1` → `0.0.2`) — fixes only, nothing new to learn as a user.
- **minor** (`0.0.2` → `0.1.0`) — new capability, existing behaviour intact.
- **major** (`0.x` → `1.0`) — behaviour removed or changed out from under you.

While the site is pre-1.0, a minor bump is the honest choice for anything that
changes what a surface does, because there is no stability promise yet to break.

## Rules

- **No direct pushes to `main` or `dev`.** Every change, regardless of size or
  who or what authors it, goes through a branch and a PR. No judgement call
  about what counts as trivial enough to skip.
- **Branch naming**: `<type>/<short-kebab-description>` — `feat/journal-page`,
  `fix/audio-player-seek`, `chore/dep-updates`. Release branches are the one
  exception: `releases/0.1.0`, named for the version rather than the work.
- **Merge strategy**: merge commits only. Squash and rebase merge are disabled
  at the repo level, deliberately — the full intermediate trail is kept,
  including an agent's "tried X, reverted, did Y", rather than flattened away.
- **Commits are atomic and meaningful on their own** — imperative subject, body
  explaining *why* where it is not obvious. No "wip" or "fix typo from last
  commit"; clean up with `--amend` or an interactive rebase before pushing, so
  what lands is already the real story.
- **An agent opens its own PR and stops.** It does not merge.

## Workflow

1. Branch off the latest `dev`.
2. Do the work, in clean atomic commits.
3. Open a PR into `dev`. The agent does this itself and stops there.
4. Review and merge into `dev`.
5. When a set of work is worth releasing, cut `releases/x.y.z` from `dev`.
6. Verify it — actually run it, on the devices that matter.
7. Fix what verification finds *on the release branch*, and merge those fixes
   back to `dev` as well.
8. Merge the release into `main` and tag it.

## PR description convention

No enforced GitHub template — this shape, by convention:

```
## Summary
- What changed, 1-3 bullets

## Why
Motivation / context for the change

## Test plan (optional)
How this was verified
```

## The obvious objection

The model this replaced was adopted *because* long-lived branches had rotted:
`dev`, `game-reviews`, `legacy-no-ai`, `react-refactor`, `refactor-mvvm`,
`routing`, `ai-refactor` — all pruned in July 2026, one of them named `dev`.
Reintroducing a permanent `dev` reintroduces that risk, and it would be
dishonest to write this document without saying so.

What makes it different is the direction of flow. The branches that rotted were
long-lived *feature* branches, each accumulating work that was never
integrated. Here `dev` is the integration point — everything lands there first
and nothing lives beside it for long. So the failure mode to watch for is not
`dev` rotting; it is `dev` drifting far ahead of `main` because releases stop
being cut. If `dev` is more than a few pieces of work ahead of `main`, cut a
release rather than adding to it.

## Gates

Manual review remains the only gate. There is no CI and no required status
checks; Docker and Vitest both exist, but nothing runs automatically on a PR.
Until that changes, "verified" on a release branch means a person actually ran
it — which is the whole reason `main` and `dev` are now separate.
