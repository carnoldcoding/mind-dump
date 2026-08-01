# Architecture

How the frontend is put together. For domain vocabulary (Review, Movement, Entry, etc.) see [`CONTEXT.md`](../CONTEXT.md).

## Stack

- **React 19** + **TypeScript**, built with **Vite 7**
- **Tailwind CSS v4**, configured CSS-first via `@theme` in `src/index.css` (not a `tailwind.config.js`) — defines the custom "nier" color palette (a NieR:Automata-inspired retro-terminal look, hence the naming)
- **react-router v7** for routing (`createBrowserRouter`, `RouterProvider`)
- **chart.js** / **react-chartjs-2** for the Body section's movement charts
- **zustand** holds the Review collection in `src/store/reviews.ts` — fetched once per page-session, read by every surface, invalidated when System writes. It sits *above* the backend seam, not inside it. Contexts (`BootSequenceContext`, `TrustedDeviceContext`) remain for ambient state never written from a page; the store is for domain data. See [ADR-0005](./adr/0005-zustand-store-for-reviews.md).
- **Vitest** (+ jsdom, `@testing-library/react`) is the test runner, added for `src/utils/animations.ts` and `src/hooks/usePanelReveal.ts`. Coverage is thin — most modules still have no tests.

## Commands

- `npm run dev` — Vite dev server (`--host`, so it's reachable on the LAN)
- `npm run build` — production build, **no typecheck**
- `npm run build-strict` — `tsc -b && vite build`, use this to actually catch type errors
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- `npm run preview` — serve the production build locally
- `npm run test` — Vitest (`vitest run`)
- `npm run migrate:body` — one-time Body data migration, dry-run by default; `-- --apply` performs it. Point it at the tailnet hostname, since `/api/body` is gated. See [ADR-0002](./adr/0002-goal-as-movement-state.md)
- `npm run migrate:dates` — one-time Review date migration to canonical ISO, dry-run by default; `-- --apply` performs it. Defaults to `date_completed`; `-- --field release_date` migrates the other one. Needs `--api <url>` or `POSTS_API_URI` — there is no default target. Point it at the tailnet hostname: reads are public, but `/api/posts/update_post` is gated. Both fields were applied against production on 2026-08-01 and the script is idempotent, so a re-run reports nothing to do

## Routing (`src/routes/index.tsx`)

All routes render inside `Layout`:

- `/` — Now (what's in progress, what's queued next, what was finished most recently)
- `/:category` — Review (category browse/filter page for `games`/`cinema`/`books`)
- `/:category/:slug` — ReviewDetail (single Review, full write-up)
- `/system` — System (password-gated admin dashboard)
- `/journal` — placeholder (`UnderConstruction`), not linked from primary nav yet

## Access (`src/context/TrustedDeviceContext.tsx`)

There is no login, no password, no token and no session anywhere in this app. Access to `System` (Review authoring + Body tracking) and to every non-public API route is gated on **network identity**: the device has to be enrolled in the Tailscale tailnet. The SPA probes a tailnet-gated endpoint on mount and only renders the `system` nav item and route if that probe succeeds; the real boundary is nginx in front of the backend. See [ADR-0001](./adr/0001-tailnet-gated-system-access.md).

There's no per-feature permission model — a trusted device can do everything.

## Backend boundary

The API is a separate repo (`mind-dump-backend`, Express) — not covered by this repo's docs. The frontend only knows it as an HTTP boundary:

- Base URL comes from `src/config.ts` (`VITE_API_URI` env var, defaults to the production API)
- Confirmed endpoints in use: `GET /api/posts` (all Reviews, or filtered by `?slug=`), `GET /api/body`, `POST /api/body/add_entry`, `POST /api/body/update_entry`, `POST /api/body/remove_entry`
- The `Body Data` collection is schemaless — the backend `$set`s whatever it's given — so a Movement's `goal` rides along on its record without any backend change
- `ReviewDetail` also manages mods, audio tracks, and screenshots per Review — check that file directly for current endpoints rather than assuming, since this doc doesn't track them individually

## Known data-model drift

`src/types/index.ts` (`GamePost`/`CinemaPost`/`BookPost`) doesn't match what the app actually reads/writes at runtime — e.g. `status`, `creator`, and `imagePath` (vs. `image_path`) are used in `ReviewPanel`/`ReviewModal` but aren't in the shared types. Treat the types file as incomplete, not authoritative, until it's reconciled.

Dates were the exception and no longer are: both `date_completed` and `release_date` are canonical ISO (`YYYY-MM-DD`) as of issue #18, migrated in place. Anything reading a date written before then should still go through `toIsoDate` from `src/pages/System/components/ReviewPanel/migration.ts` rather than growing a second conversion, but nothing in the collection needs it today. The editor's Release Date control is a native `<input type="date">`, which only understands ISO — it used to render blank for US-format dates and clear them on the next save.

## Directory conventions

- `src/pages/<PageName>/index.tsx` — one folder per route, with page-specific components in a nested `components/` folder
- `src/components/common/` — generic form/UI primitives (TextField, Button, Card, etc.), used across pages
- `src/components/layout/` — site chrome (Navigation, Layout, background animations)
- `src/components/search/` — the Search modal and the hook holding its open state. A feature folder rather than a `common/` primitive: Search is one thing with one home, mounted by `Layout` so it is reachable from every page, and its hook is meaningless away from it ([ADR-0003](./adr/0003-search-as-modal-now-as-front-page.md))
- `src/types/index.ts` — shared TypeScript types (see drift note above)
- `src/store/` — zustand stores for domain data (`reviews.ts`). Surfaces read through the exported hook and never fetch for themselves
- `src/utils/` — helpers and static data (genres lists, etc.)
- `src/styles/` — extra CSS beyond Tailwind utilities (`animations.css`, `custom.css`) — look here for the `nier-enter`/`nier-modal-enter` transition classes used throughout modals and page transitions
- `src/utils/animations.ts` — single seam for the `VITE_DISABLE_ANIMATIONS` dev flag (set in `.env.local`, build-time, restart the dev server to pick up a change). When set, panel-reveal and modal enter/backdrop animations resolve instantly instead of animating — useful when iterating on layout. Does not affect the boot sequence, `Navigation`'s entrance, the ambient background, or the loading spinner.
