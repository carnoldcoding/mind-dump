---
status: accepted
---

# Reveals replay on arrival, and the shelf frame is stable chrome

Every surface builds a paused entrance timeline on mount and plays it when the
boot sequence raises its signal (ADR-0006, ADR-0007). That covers the first
load well. It does nothing afterwards: the signal is a latch that stays raised,
so once boot is done a surface plays its entrance once and the app goes still.
Moving around it — landing on a page a second time, toggling between the Category
shelves — produced no motion.

The Category shelves are the sharp case. Games, Cinema and Books are one
component that swaps its data by URL param; React Router keeps the instance and
re-renders rather than remounting. A comment claimed the shelf re-animated on a
Category change, but the reveal hooks keyed their rebuild on values that do not
change on a toggle (the card domino on `loading`, the frame-and-title timeline
on nothing at all). So switching shelves silently replaced the cards with no
entrance — the comment described an intention the wiring never carried out.

## Decision

Arrival re-triggers a surface's entrance, and "arrival" has two mechanisms:

- **A distinct route remounts.** Navigating to a different page unmounts the old
  one and mounts the new, which rebuilds its reveal timelines. Data lives in the
  shared Review store (fetched once per session), so the remount does not
  refetch — it is cheap. No new machinery; this is React Router's default.
- **A same-component param keys its content timelines.** The shared shelf passes
  the Category into the `rebuildOn` of its *content* timelines, which the reveal
  system already treats as "a different entrance, not the same one at a different
  moment" — it reverts the previous entrance's inline styles and replays. The
  panel title re-Decodes toward the new name, the hairlines re-Grow, the genre
  rows and cards re-Domino. `PageHeader` likewise keys its title Decode on the
  title text, so a heading that changes without a remount re-scrambles.

**The shelf frame is deliberately excluded from the per-Category rebuild.** Its
Wipe is keyed on nothing, so it wipes once when the shelf mounts (arriving from
another page) and then persists across Games/Cinema/Books toggles. The shelf
reads as fixed chrome whose contents refresh, rather than a window torn down and
rebuilt on every tab. This is why the frame's Wipe and the title's Decode, which
used to share one timeline, are split into two: they now have different
`rebuildOn`, so they cannot live together.

## Consequences

- The shelf's Fragment is no longer keyed on the Category. Keying it remounted
  the whole subtree — including the frame — which both re-created the frame
  needlessly and, because the reveal hooks sit above the Fragment, never
  actually rebuilt the entrance. `rebuildOn` replaces it.
- In-page state that lives inside a remounted subtree resets on navigation — a
  fresh arrival, which is wanted here. State that must survive a nav is lifted
  above the remount boundary rather than the rule being bent around it.
- A surface that changes its own text without remounting must key its Decode on
  that text, or the heading will not track the change. This is the one place the
  otherwise-empty `rebuildOn` earns an entry on a title.
