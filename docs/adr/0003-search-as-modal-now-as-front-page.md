---
status: accepted
amended: 2026-08-02
---

# Search is a modal, and the front page is Now

Search was the index route. `/` rendered it, and the first nav tab pointed there with a magnifying-glass icon. It worked, it ranked results across all three Categories, and it went unused — not rarely, but never. A search box is the right shape for a collection you can't hold in your head; this collection is one person's, and they were there when every row went in.

Meanwhile the site had no answer to "where am I". The Category pages are shelves of finished work. System is for authoring. Nothing showed what was being played, watched and read right now, which is the only thing that changes between one visit and the next.

> **Amendment (2026-08-02).** Everything below holds. Search is a **modal**,
> as originally decided — an in-bar prompt was tried in between and reverted:
> it read as a text field grafted onto a row of tabs, and expanding the chrome
> in place made the bar jump.
>
> What changed is only how it is *reached*. Search is now a **nav tab shaped
> exactly like the destinations**, which opens the modal instead of navigating,
> and takes the active state while the modal is open — so the bar still says
> where you are. The floating icon that prompted all of this is gone either
> way.
>
> The rest is unchanged: Search is not a *place*, `/` belongs to Now, the open
> state lives in the URL as a bare `?search` for the sake of the iOS
> back-swipe, and the typed query stays out of the URL.

So the two swap. **Now** takes `/` — Reviews with Status `active` across every Category, a capped band of what's queued next, and what was finished most recently. **Search** stops being a place and becomes a modal, opened from a pinned control in the nav bar or `Cmd`/`Ctrl+K`, available on every page instead of on one page nobody visited.

## Opening Search is a navigation

The modal's open state lives in the URL as a bare `?search` param, pushed on open and popped on close. This is deliberate and unlike every other modal in this codebase, all of which are pure local state via `createPortal`.

The reason is iOS. The back-swipe is the dismiss gesture on a phone, and a modal outside history turns that gesture into "leave the page entirely". With the param, back closes Search and leaves you where you were.

The typed query stays out of the URL. Putting it there means either a history entry per keystroke or a replace-per-keystroke dance, to make shareable a query string that has no one to share it with.

## What Search now finds

Everything, queued items included, each result marked with its Status. The old page excluded `todo` on the grounds that a queued item had nothing to read. That reasoning no longer holds — queued Reviews are openable and have real pages — and it cost the one question worth asking before capturing something: is this already in here?

## Consequences

- `src/pages/Search/` is deleted. `rankByTitle` and the grouped-results markup move into the modal; nothing else survives.
- `navItems[0]` stops being a route and the bar gains a control that isn't a `Link` — the first non-navigating thing in it.
- Completion dates had to be fixed to build this. `ReviewModal` wrote `dateCompleted` as a US-locale string (`"08/01/2026"`); `ReviewList` and the Category grids read `date_completed`, and the backend stores `req.body` verbatim, so the two never met. Every "sort by date" in the app has silently been sorting by `release_date`. The canonical key is `date_completed`, ISO-formatted, and `npm run migrate:dates` folds the old values in — dry-run by default, explicit `--apply`, no default target, following `migrate-body`.
- A tolerant reader accepting either key was rejected for the reason ADR-0002 gives: the branch outlives the migration it replaces.
