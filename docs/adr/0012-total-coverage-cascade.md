---
status: accepted
---

# Nothing arrives un-animated: the total-coverage Cascade

The nested marker grammar (ADR-0011) revealed the elements it was told to — the
ones carrying `data-section`, `data-ripple-item`, `data-section-header`. That is
opt-in, and opt-in leaves gaps: every element without a marker had no tween, so
at the reveal signal it was simply *there*. On the Category shelf that was most
of the surface — the gutter rail, the caption bar, the Clear button, the search
input, the status readouts, the empty-slot furniture. The result read as a few
things animating over a mostly-static page, and things "popped in".

The requirement that replaced it: **nothing pops. Every element is on the
timeline.**

## Decision

Reveal by walking the subtree, not by tagging elements. `cascade(timeline, root)`
descends `root` in DOM order and gives **every leaf** its own beat at a running
position. A leaf is an element with its own text, an interactive or media
element, a marked card, or one with no element children; anything else is layout
and is walked through to its leaves.

The guarantee that nothing pops is now structural rather than a matter of
remembering to tag each element:

- `.from()` hides an element the moment its tween is built (ADR-0007). So a leaf
  with a tween starts hidden and is revealed on its beat.
- A leaf with **no** tween is therefore the only thing that can pop — and the
  walk reaches every leaf, so there is none.

The primitive each leaf gets is read off its markers: a title or section header
Decodes, a hairline Grows, a card falls in a Domino, everything else Ripples in
place. So the primitives and their markers (ADR-0011) survive; what changed is
that coverage is total and driven by the walk, not by a per-section timeline.

## What this supersedes

- **The section-split timelines of ADR-0011 are gone.** The shelf had six reveal
  timelines split by what replayed on a Category toggle (stable headers keyed on
  nothing, volatile cells keyed on the Category, and so on). They are replaced by
  two: the frame's Wipe (still stable chrome, keyed on nothing, still not
  re-wiping on a toggle — ADR-0010 holds) and one content Cascade keyed on
  `[loading, category, visibleGenres]`.
- **"Replay only what changed" is dropped in favour of total coverage.** A
  Category toggle now re-cascades the whole content — every element re-animates,
  which is the point. A mere filter toggle changes none of the Cascade's keys, so
  filtering does not re-cascade. The `Ripple` primitive and `decodeGroup` from
  ADR-0011 are subsumed: the Cascade's running-position walk produces the same
  in-place staggered fade per group, so `decodeGroup` is gone and `ripple` is now
  the Cascade's default leaf reveal.

## Consequences

- Adding an element to the page animates it for free — it is a leaf under the
  frame, so the walk reaches it. There is no marker to forget.
- The sequence is one continuous DOM-order cascade, which is what makes it read
  as assembly rather than several timelines firing at once. `REVEAL_STEP` is the
  single pacing knob; `cascade`'s `startPosition` places it after the frame Wipe
  begins.
- The Cascade is built at `contentActive` (not gated on the fetch) so it hides
  the content at mount rather than letting it show un-animated, and rebuilds on
  `[loading, category, visibleGenres]` to catch the fetched cards and rows. On a
  cold load where the fetch outlasts boot's reveal signal, the static content can
  animate once at mount and again when the cards land; in practice the fetch
  resolves during boot, so it is one pass.
- The frame's Wipe clips the panel's backgrounds and bars in geometrically; the
  leaves inside stay hidden until their Cascade beat, so the bars are not a pop
  either — they arrive with the frame.
- This is the reference surface. Every other surface adopts the same
  `cascade(frame)` call over its own frame; the sweep is one call per surface, not
  per-element tagging. It has since been applied across the app — the Now page,
  ReviewDetail, the System Desktop, its Body / Backlog / Reviews windows, all five
  editors, and the mobile nav. Boot stays out (its own choreography, `bootMotion.ts`).

## Refinements from the site-wide sweep

- **Concurrency between components.** A single running position made the whole
  surface strictly sequential. Two step sizes replace it: `REVEAL_STEP` between
  sibling leaves within a component, and a shorter `BRANCH_STEP` before the next
  sibling *sub-tree*, so a component's later beats overlap the next component's
  earlier ones. Separate components run almost in parallel; leaves inside each
  still iterate one after another.
- **Coalescing.** Walking to the deepest node made a labelled field (wrapper +
  label + input) three beats and a real form a hundred-odd — too granular to read,
  and slow enough to build to time a jsdom test out. A small compound (`≤
  COALESCE_MAX` descendants) with no chrome inside it is now revealed as one beat;
  a sub-tree that holds a header, or is large, is still walked into.
- **`data-reveal-own`.** A sub-tree that runs its own timeline — a shared review
  grid that Dominoes on its own readiness, a chart that draws itself — carries
  this marker, and the Cascade steps over it rather than double-animating it.
- **Headers stopped popping.** Decode is a `.to()` and, unlike the `.from()`
  primitives, does not hide its target on build — a decoded header sat visible
  showing its real text until its beat. The Cascade now Fades a header at the same
  beat it Decodes it, so it is hidden on build and arrives as its text scrambles.
- **Modals.** A Modal Wipes its own surface (`usePresenceTimeline`); the editor's
  `cascade(article)` reveals the interior, so the two compose without either
  knowing about the other.
