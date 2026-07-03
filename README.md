# Mind Dump

A personal app for reviewing games, movies, and books, and tracking body/workout data over time. Single-user, gated behind one shared admin password for the authoring/tracking side; the review browsing side is public.

Frontend only — the API lives in a separate `mind-dump-backend` repo.

## Getting started

```
npm install
npm run dev
```

## Scripts

- `npm run dev` — dev server
- `npm run build-strict` — typecheck (`tsc -b`) + production build
- `npm run build` — production build without typecheck
- `npm run lint`
- `npm run preview` — serve the production build locally

## Docs

- [`CLAUDE.md`](./CLAUDE.md) — orientation for working in this codebase
- [`CONTEXT.md`](./CONTEXT.md) — domain vocabulary
- [`docs/architecture.md`](./docs/architecture.md) — stack, routing, auth, backend boundary
- [`docs/branching.md`](./docs/branching.md) — git workflow
