# Mind Dump (Frontend)

A personal, single-user app for two things: writing reviews of games/movies/books, and tracking body/workout data over time. It's gated behind a single shared admin password (`system`) — there's no multi-user concept anywhere in this app.

## Language

### Reviews

**Review**:
A single game, movie, or book the user is tracking — from the moment it's queued up to the finished, rated critique. Covers its whole lifecycle; there is no separate "queued item" concept.
_Avoid_: Post (used in the type names `GamePost`/`CinemaPost`/`BookPost` and in fetch/filter code, but "Review" is the canonical term going forward)

**Status**:
A Review's place in its lifecycle: `todo` (queued, not started), `active` (currently being played/watched/read, no critique written yet), or `done` (finished, has a rating and written critique).

**Category**:
The kind of Review — `games`, `cinema`, or `books`. Used in URLs and navigation (plural form). The underlying `type` field on a Review is singular (`game`, `cinema`, `book`).

**Mod**:
A game modification attached to a game Review — a name, optional author, URL, and notes. Only meaningful for `game`-category Reviews.

**Genre, Developer, Platform, Director, Author**:
Descriptive metadata on a Review. Games have developers + platforms; cinema has a director; books have an author. Genres apply to all three but are drawn from different lists per category.

### System (admin area)

**System**:
The password-gated personal dashboard, styled as a retro desktop/terminal. Contains two areas ("windows"): Reviews management and Body tracking. This is where Reviews get authored/edited — the public Search/Category pages are read-only.

### Body tracking

**Movement**:
A named exercise (e.g. "Bench Press") that the user tracks over time. Has a display name, an `upper`/`lower` tag, free-text notes, and a manual sort order.
_Avoid_: Workout — "workout" isn't a distinct concept in this app (see below).

**Entry** *(current shape — see note below)*:
A single dated data point logged against a Movement. Currently one flat shape covers two different meanings, distinguished only by which optional fields happen to be set: a **logged set** (`weightUsed`/`repsCompleted`/`setsCompleted` — what was actually done) or a **goal** (`weightGoal`/`repGoal`/`setGoal` — a target). A Movement's own metadata is also stored as an Entry, flagged `_meta: true`, in the same flat list as real log/goal entries.
_Known issue, planned refactor_: this overloading (log vs. goal vs. meta, all inferred from field presence rather than an explicit discriminator) is slated to be split into distinct types in an upcoming refactor. Update this entry when that lands.

**"Workout"**:
Not a modeled entity — no session groups multiple Movements together. Used informally in UI copy/component names ("Log Workout" button, "Workout Frequency" grid) to mean "logging a set against a Movement."

### Journal

Planned third area (alongside Reviews and Body) for free-form entries. Not yet built — currently a placeholder page, and hidden from primary navigation.
