# Architecture

How the frontend is put together. For domain vocabulary (Review, Movement, Entry, etc.) see [`CONTEXT.md`](../CONTEXT.md).

## Stack

- **React 19** + **TypeScript**, built with **Vite 7**
- **Tailwind CSS v4**, configured CSS-first via `@theme` in `src/index.css` (not a `tailwind.config.js`) — defines the custom "nier" color palette (a NieR:Automata-inspired retro-terminal look, hence the naming)
- **react-router v7** for routing (`createBrowserRouter`, `RouterProvider`)
- **chart.js** / **react-chartjs-2** for the Body section's movement charts
- **zustand** is a dependency but is currently **unused** — no store exists anywhere in `src/`. Don't assume global state management is in place.
- **Vitest** (+ jsdom, `@testing-library/react`) is the test runner, added for `src/utils/animations.ts` and `src/hooks/usePanelReveal.ts`. Coverage is thin — most modules still have no tests.

## Commands

- `npm run dev` — Vite dev server (`--host`, so it's reachable on the LAN)
- `npm run build` — production build, **no typecheck**
- `npm run build-strict` — `tsc -b && vite build`, use this to actually catch type errors
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- `npm run preview` — serve the production build locally
- `npm run test` — Vitest (`vitest run`)

## Routing (`src/routes/index.tsx`)

All routes render inside `Layout`:

- `/` — Search (global search across all Reviews)
- `/:category` — Review (category browse/filter page for `games`/`cinema`/`books`)
- `/:category/:slug` — ReviewDetail (single Review, full write-up)
- `/system` — System (password-gated admin dashboard)
- `/journal` — placeholder (`UnderConstruction`), not linked from primary nav yet

## Auth (`src/context/AuthContext.tsx`)

Single shared admin credential, not a multi-user account system. Login posts a password to the backend; on success a bearer token is stored in `localStorage` (`adminToken`) and verified against `/api/auth/verify` on mount. This gate gives access to the entire `System` area (Review authoring + Body tracking) — there's no per-feature permission model.

## Backend boundary

The API is a separate repo (`mind-dump-backend`, Express) — not covered by this repo's docs. The frontend only knows it as an HTTP boundary:

- Base URL comes from `src/config.ts` (`VITE_API_URI` env var, defaults to the production API)
- Confirmed endpoints in use: `GET /api/posts` (all Reviews, or filtered by `?slug=`), `GET /api/auth/verify`, `GET /api/body`, `POST /api/body/add_entry`, `POST /api/body/update_entry`, `POST /api/body/remove_entry`
- `ReviewDetail` also manages mods, audio tracks, and screenshots per Review — check that file directly for current endpoints rather than assuming, since this doc doesn't track them individually

## Known data-model drift

`src/types/index.ts` (`GamePost`/`CinemaPost`/`BookPost`) doesn't match what the app actually reads/writes at runtime — e.g. `status`, `creator`, and `imagePath` (vs. `image_path`) are used in `ReviewPanel`/`ReviewModal` but aren't in the shared types. Treat the types file as incomplete, not authoritative, until it's reconciled.

## Directory conventions

- `src/pages/<PageName>/index.tsx` — one folder per route, with page-specific components in a nested `components/` folder
- `src/components/common/` — generic form/UI primitives (TextField, Button, Card, etc.), used across pages
- `src/components/layout/` — site chrome (Navigation, Layout, background animations)
- `src/types/index.ts` — shared TypeScript types (see drift note above)
- `src/utils/` — helpers and static data (genres lists, etc.)
- `src/styles/` — extra CSS beyond Tailwind utilities (`animations.css`, `custom.css`) — look here for the `nier-enter`/`nier-modal-enter` transition classes used throughout modals and page transitions
- `src/utils/animations.ts` — single seam for the `VITE_DISABLE_ANIMATIONS` dev flag (set in `.env.local`, build-time, restart the dev server to pick up a change). When set, panel-reveal and modal enter/backdrop animations resolve instantly instead of animating — useful when iterating on layout. Does not affect the boot sequence, `Navigation`'s entrance, the ambient background, or the loading spinner.
