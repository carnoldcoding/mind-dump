---
status: accepted
---

# The Backlog is everything unfinished, and it splits System in two

There was no way to note down "I'd love to play that someday". A Review could be created with Status `todo`, but creating one meant a form built for finished work — slug, genres, developers, platforms, image path, a critique shape with nothing to put in it — so the thought cost more to record than it was worth. Nothing outside System listed queued items either: Category grids filter to `done`, and Search excluded `todo`.

The Backlog is now a first-class feature. It is **every Review that isn't finished** — Status `todo` or `active` — seen as one shelf across all Categories.

## It stays one entity

A Backlog item is a Review, not a new kind of document. `CONTEXT.md` already said a Review "covers its whole lifecycle; there is no separate 'queued item' concept", and that holds: nothing is promoted, nothing is copied, no second collection appears, and a Review keeps one URL from the day it's captured to the day it's rated.

What changes is authoring, not storage. Capture asks for a title and a Category; everything else appears when the Review reaches the stage that needs it.

## Leaving the Backlog means finishing, not starting

An `active` Review stays on the Backlog. It appears on Now as well, and that overlap is the point rather than a leak — the Backlog is the list of things not yet done, and starting something doesn't take it off that list. Now is the glance, the Backlog is the shelf, and they answer different questions about the same Reviews.

## The System split

The Backlog gets a folder in System beside Reviews and Body, and the two divide the collection by lifecycle:

- **Backlog** owns unfinished work: capture, grooming, and the `todo → active → done` transitions.
- **Reviews** narrows to `done` — critique, rating, screenshots, audio, mods.

This mirrors the public side exactly: the Backlog page is unfinished work, the Category pages are finished work. The alternative — a Backlog folder that is a filtered `ReviewPanel` — was rejected because it leaves every `active` Review editable from two windows through two different interfaces.

## Consequences

- `ReviewsWindow` narrows from the whole collection to `done`. Its charts still read everything.
- Marking something done in Backlog hands it to Reviews to be written up. That handoff is a real seam in the workflow, and the cost of the split.
- The public `/backlog` page takes a sixth nav slot. The desktop bar's `w-45` tabs need 1280px to sit uncompressed; below that they shrink, as they already do at five below 1060px.
- Queued Reviews become publicly visible for the first time. Acceptable: the site is unadvertised, has no SEO, and has one reader.
- Writing stays inside System. Capture is a few presses rather than one, and the invariant that public pages are read-only survives.
