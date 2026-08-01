# Mind Dump (Frontend)

Personal, single-user app for writing reviews of games/movies/books and tracking body/workout data over time. React 19 + TypeScript + Vite, Tailwind v4, react-router v7. Vitest for tests, though coverage is still thin — most modules have none yet.

Read these before making non-trivial changes:

- [`CONTEXT.md`](./CONTEXT.md) — domain vocabulary (Review, Status, Movement, Entry, etc.). Use these terms, not ad-hoc synonyms.
- [`docs/architecture.md`](./docs/architecture.md) — stack, routing, auth, backend boundary, directory conventions, known data-model drift.
- [`docs/branching.md`](./docs/branching.md) — git workflow: trunk-based, branch+PR for every change, no direct pushes to `main` (enforced by branch protection).

## Commands

- `npm run dev` — dev server
- `npm run build-strict` — typecheck + build (use this, not `npm run build`, to catch type errors)
- `npm run lint`
- `npm run test` — Vitest

## Things that will surprise you

- Two state idioms coexist, and which one to reach for is the question worth asking. **Contexts** (`BootSequenceContext`, `TrustedDeviceContext`) are for ambient things never written from a page. The **zustand store** (`src/store/reviews.ts`) is for domain data — writers in System, readers on public pages. See [ADR-0005](./docs/adr/0005-zustand-store-for-reviews.md).
- The Review collection is fetched once per page-session and shared. Surfaces read it with `useReviews()` and never fetch it themselves; System writes call `invalidateReviews()`. A reload refetches — nothing is cached across sessions.
- `date_completed` is the canonical completion date, ISO `YYYY-MM-DD`. `release_date` is *not* — it's still stored US-first (`mm/dd/yyyy`), so anything comparing release dates has to convert first.
- The backend (`mind-dump-backend`) is a separate repo. This repo only knows it as an HTTP API — see `docs/architecture.md` for the boundary and confirmed endpoints.
- `src/types/index.ts` doesn't match runtime data shapes in several places (see `docs/architecture.md`). Don't treat it as authoritative.
- Body tracking stores two kinds of document in one collection — Movement and Entry — told apart by an explicit `_meta` flag, not by guessing from field presence. A Goal is current state on a Movement, so there is no goal history and no way to ask what a target used to be ([ADR-0002](./docs/adr/0002-goal-as-movement-state.md)).
- Every change, including small ones, goes through a branch + PR — `main` rejects direct pushes.
