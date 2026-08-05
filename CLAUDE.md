# Mind Dump (Frontend)

Personal, single-user app for writing reviews of games/movies/books and tracking body/workout data over time. React 19 + TypeScript + Vite, Tailwind v4, react-router v7. Vitest for tests, though coverage is still thin — most modules have none yet.

Read these before making non-trivial changes:

- [`CONTEXT.md`](./CONTEXT.md) — domain vocabulary (Review, Status, Movement, Entry, etc.). Use these terms, not ad-hoc synonyms.
- [`docs/architecture.md`](./docs/architecture.md) — stack, routing, auth, backend boundary, directory conventions, known data-model drift.
- [`docs/branching.md`](./docs/branching.md) — git workflow: `dev` is the trunk, `main` is release-only. Branch off `dev`, PR back into `dev`; `main` receives merges from `releases/*` alone.
- [`docs/motion.md`](./docs/motion.md) — the three motion mechanisms (GSAP timelines, CSS transitions, CSS keyframes) and where the boundary between them is, the five primitives (Wipe, Domino, Growth, Decode, Fade), phase and Response, the reveal sequence, and how to turn motion off. Read before touching anything that animates.

## Commands

- `npm run dev` — dev server
- `npm run build-strict` — typecheck + build (use this, not `npm run build`, to catch type errors)
- `npm run lint`
- `npm run test` — Vitest
- `node scripts/lint-budget.mjs` — the lint gate CI runs. Fails only if a branch *adds* eslint errors; the repo's existing 69 are recorded in `.eslint-budget`. Under budget, lower it with `--update`

## CI

Pull requests into `dev` and `main` run typecheck, tests and the lint budget on Node 24 — the version the API runs in production. There is no build step: `npm run build-strict` cannot run because `dist/assets` is root-owned from an old Docker build.

## Things that will surprise you

- Two state idioms coexist, and which one to reach for is the question worth asking. **Contexts** (`BootSequenceContext`, `TrustedDeviceContext`) are for ambient things never written from a page. The **zustand store** (`src/store/reviews.ts`) is for domain data — writers in System, readers on public pages. See [ADR-0005](./docs/adr/0005-zustand-store-for-reviews.md). A third, much smaller shape exists for two module-level flags that are not domain state and have exactly one writer each: Search's "did we push the history entry" flag, and the motion override in `src/utils/animations.ts`. Both are `useSyncExternalStore` over a module `let`. Don't grow this into a pattern — reach for a Context or the store.
- The Review collection is fetched once per page-session and shared. Surfaces read it with `useReviews()` and never fetch it themselves; System writes call `invalidateReviews()`. A reload refetches — nothing is cached across sessions.
- Status splits the app in two, on both sides of the trust line. Unfinished (`todo`/`active`) is the Backlog page and the System Backlog folder; finished (`done`) is the Category shelves and the System Reviews window. Membership is derived from Status and never stored, and a Review keeps one identity and one URL across the whole lifecycle — nothing is promoted or copied ([ADR-0004](./docs/adr/0004-backlog-as-unfinished-work.md)).
- Both Review dates — `date_completed` and `release_date` — are canonical ISO `YYYY-MM-DD`, migrated in place. They used to be US-first (`mm/dd/yyyy`), which is why `toIsoDate` exists; don't write a second conversion.
- The backend (`mind-dump-backend`) is a separate repo. This repo only knows it as an HTTP API — see `docs/architecture.md` for the boundary and confirmed endpoints.
- `src/types/index.ts` doesn't match runtime data shapes in several places (see `docs/architecture.md`). Don't treat it as authoritative.
- Body tracking stores two kinds of document in one collection — Movement and Entry — told apart by an explicit `_meta` flag, not by guessing from field presence. A Goal is current state on a Movement, so there is no goal history and no way to ask what a target used to be ([ADR-0002](./docs/adr/0002-goal-as-movement-state.md)).
- Motion is GSAP timelines, built `paused` and played on the boot sequence's signal ([ADR-0007](./docs/adr/0007-gsap-timelines-own-motion.md)). Building the timeline is what hides the surface — `.from()` applies its start values on creation — so there is no separate gate, and an unplayed timeline cannot spend itself unseen. That was the bug: `visibility: hidden` does not stop a CSS animation. Exit is the entrance reversed, never declared twice. Hover/focus feedback stays CSS transitions and is gated by a `motion-off` class, not by a timeline. Panels are drawn with `Panel`, which owns the frame and its shadow as one object and mounts without waiting for data.
- Every change, including small ones, goes through a branch + PR, and branches off **`dev`** rather than `main`. `main` only ever receives a release. If you are about to branch off `main`, you are on the wrong trunk.
