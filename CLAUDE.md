# Mind Dump (Frontend)

Personal, single-user app for writing reviews of games/movies/books and tracking body/workout data over time. React 19 + TypeScript + Vite, Tailwind v4, react-router v7. No test suite yet.

Read these before making non-trivial changes:

- [`CONTEXT.md`](./CONTEXT.md) — domain vocabulary (Review, Status, Movement, Entry, etc.). Use these terms, not ad-hoc synonyms.
- [`docs/architecture.md`](./docs/architecture.md) — stack, routing, auth, backend boundary, directory conventions, known data-model drift.
- [`docs/branching.md`](./docs/branching.md) — git workflow: trunk-based, branch+PR for every change, no direct pushes to `main` (enforced by branch protection).

## Commands

- `npm run dev` — dev server
- `npm run build-strict` — typecheck + build (use this, not `npm run build`, to catch type errors)
- `npm run lint`

## Things that will surprise you

- `zustand` is installed but unused — there is no global store in this codebase.
- The backend (`mind-dump-backend`) is a separate repo. This repo only knows it as an HTTP API — see `docs/architecture.md` for the boundary and confirmed endpoints.
- `src/types/index.ts` doesn't match runtime data shapes in several places (see `docs/architecture.md`). Don't treat it as authoritative.
- The Body-tracking `Entry` shape currently conflates logged sets, goals, and movement metadata into one flat record, distinguished only by which optional fields are set. A refactor to split these is planned — check `CONTEXT.md` for current status before relying on this shape.
- Every change, including small ones, goes through a branch + PR — `main` rejects direct pushes.
