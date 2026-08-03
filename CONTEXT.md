# Mind Dump (Frontend)

A personal, single-user app for two things: writing reviews of games/movies/books, and tracking body/workout data over time. There's no multi-user concept anywhere in this app — access to `System` is gated by network identity (see **Trusted device** below), not a password. See [ADR-0001](./docs/adr/0001-tailnet-gated-system-access.md).

## Language

### Reviews

**Review**:
A single game, movie, or book the user is tracking — from the moment it's queued up to the finished, rated critique. Covers its whole lifecycle; there is no separate "queued item" concept.
_Avoid_: Post (used in the type names `GamePost`/`CinemaPost`/`BookPost` and in fetch/filter code, but "Review" is the canonical term going forward)

**Status**:
A Review's place in its lifecycle: `todo` (queued, not started), `active` (currently being played/watched/read), or `done` (finished and judged).

Status says where the *work* is, not how much has been written about it. It used to claim that `active` had no critique yet and that `done` was the one that had a rating — neither holds. A Critique accumulates from whenever you start writing, so an `active` Review may carry several sections and a rating already, and going `done` adds nothing but the decision that you are finished.

**Category**:
The kind of Review — `games`, `cinema`, or `books`. Used in URLs and navigation (plural form). The underlying `type` field on a Review is singular (`game`, `cinema`, `book`).

**Critique**:
The written part of a Review, divided into sections. A Category defines **at most** four — games get story/gameplay/graphics/sound, cinema story/cinematography/casting/sound, books story/world/characters/writing — and **any of them may be absent by design**. A fighting game with nothing worth saying about story is complete without a story section; the four are what is available to write, never a standard the work must meet.

So four sections written and three sections written are both simply what they are. Nothing may present a Critique as a fraction, a total, or progress toward four: a denominator would be the interface imposing exactly the uniformity this shape exists to avoid. Surfaces show the sections that exist and draw nothing for the ones that don't — the same rule the Category shelf's line and the Review detail's tabs already follow.

A Critique also accumulates while a Review is unfinished. Writing as you go is normal, so sections and a rating on a `todo` or `active` Review are not drift; `done` means you stopped and judged it, not that the writing began there.
_Avoid_: "complete"/"incomplete" critique, "missing sections", any n-of-4 phrasing.

**Now**:
The site's front page: what is being played, watched and read at this moment — every Review with Status `active`, across all Categories at once — with what's queued up next and what was finished most recently on either side of it. The only view that answers "where am I" rather than "what do I have".

The page reads **CURRENT** wherever a reader sees it — the nav tab, the page header and the panel title. Three letters were too small a target for the eye in a bar of six-letter words. UI copy only, the same way the Backlog says "Started" for Status `active`: the route, the component and this term are all still Now.
_Avoid_: Home, Dashboard, Index

**Capture**:
Recording a Review at the moment it occurs to you — a title and a Category, nothing more. The rest of a Review's fields are asked for later, at the stage that needs them.
_Avoid_: Add, Create, Quick-add

**Backlog**:
Everything unfinished, across all Categories at once — Reviews with Status `todo` or `active`. A Review joins it the moment it's captured and leaves it only when it goes `done`; nothing is added or removed by hand. Starting something doesn't take it off the list, because it isn't off the list until it's finished.

Lives **only in System**. There was a public Backlog page; it overlapped Now too heavily once both showed cards, and Now is the page that matters to a reader ([ADR-0004](./docs/adr/0004-backlog-as-unfinished-work.md)).
_Avoid_: Queue, Wishlist, To-read, Someday list

**Started / Not Started**:
How the Backlog labels the two Statuses it contains — `active` and `todo` respectively. UI copy, not a fourth and fifth Status: the underlying values are unchanged, and "Started" on the Backlog is the same thing as "In Progress" on Now. Both shelves exist so the overlap with Now reads as deliberate rather than as duplication.

**Search**:
Title lookup across every Category and every Status, opened as a modal rather than visited as a page. It has no control in the navigation bar: each Category shelf searches itself from a field in its own panel, beside filters a modal cannot offer, so the bar's Search tab had become a second and worse way to do what the page you are on already does. Reached by keyboard, or by a URL carrying the param. Still finds all Reviews, queued ones included, so it also answers whether something has already been captured — which matters more now that the Backlog is System-only.
_Avoid_: Find, Filter, Query

**Readout**:
A `label ....... value` figure derived from Reviews already loaded — never stored, never entered, so a readout cannot be out of date. The footer band carries four on every page: how much is in progress, how much is queued, how much was finished this year, and the average rating of finished work.

Not only the footer's. A Category shelf and the System Backlog each carry a column of them, and the rule for those is that a surface's readouts answer what the footer cannot — the footer's figures are collection-wide, so repeating them beside a single Category would put the same numbers on screen twice.
_Avoid_: stat, metric, score — nothing here is scored or tracked against a target, and the component is named `Readout` for that reason.

**Mod**:
A game modification attached to a game Review — a name, optional author, URL, and notes. Only meaningful for `game`-category Reviews.

**Genre, Developer, Platform, Director, Author**:
Descriptive metadata on a Review. Games have developers + platforms; cinema has a director; books have an author. Genres apply to all three but are drawn from different lists per category.

### System (admin area)

**System**:
The personal dashboard, styled as a retro desktop/terminal, reachable only from a **Trusted device**. Contains three areas ("windows"): Backlog, Reviews management, and Body tracking. This is where Reviews get authored/edited — the public Now/Backlog/Category pages are read-only.

The first two split the collection by lifecycle: **Backlog** owns unfinished work — capture, grooming, and the `todo → active → done` transitions — and **Reviews** owns finished work: critique, rating, screenshots, audio, mods. An unfinished Review is edited from the Backlog folder, since the Reviews window no longer lists it ([ADR-0004](./docs/adr/0004-backlog-as-unfinished-work.md)).

**Trusted device**:
A device (currently: one phone, one computer) enrolled in the Tailscale tailnet used to reach `System` and every non-public API route. Trust is network identity, not a credential — there is no login form, password, or token anywhere in this app. See [ADR-0001](./docs/adr/0001-tailnet-gated-system-access.md).
_Avoid_: "logged in" / "authenticated" — there's no session or account, just network membership.

### Body tracking

**Movement**:
A named exercise (e.g. "Bench Press") that the user tracks over time. A stored record — it exists in its own right, whether or not anything has ever been logged against it, and survives the deletion of all its Entries. Has a display name, an `upper`/`lower` tag, free-text notes, a manual sort order, and a current Goal.
_Avoid_: Workout — "workout" isn't a distinct concept in this app (see below).

**Goal**:
The target a Movement is currently being worked toward — some combination of sets, reps and weight. A Movement has at most one at a time; setting a new Goal replaces the old one, and no record of previous targets is kept. See [ADR-0002](./docs/adr/0002-goal-as-movement-state.md).
_Avoid_: treating a Goal as an event or a dated thing — it's current state, and asking "what was my goal in March" is not a question this app can answer.

**Entry**:
A single dated record of a set that was actually performed against a Movement — sets, reps and weight completed. Nothing else lives in this shape: Goals belong to the Movement, and a Movement's own identity is a Movement record rather than a specially flagged Entry.

**"Workout"**:
Not a modeled entity — no session groups multiple Movements together. Used informally in UI copy/component names ("Log Workout" button, "Workout Frequency" grid) to mean "logging a set against a Movement."

### Journal

Planned third area (alongside Reviews and Body) for free-form entries. The frontend is currently just a placeholder page, hidden from primary navigation — but the backend already has a full CRUD API for it (`/api/soul`, `Soul Data` collection), unauthenticated until [ADR-0001](./docs/adr/0001-tailnet-gated-system-access.md) lands.
_Avoid_: "Soul" outside of backend code — `soul` is the backend's internal name (route path, collection name); "Journal" is the user-facing term.
