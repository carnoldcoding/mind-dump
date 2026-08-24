# Motion

How this app animates. Vocabulary and rules live here rather than in
[`CONTEXT.md`](../CONTEXT.md), which is a domain glossary and stays free of
implementation — a Wipe is not a thing the collection contains.

Motion is built with [GSAP](https://gsap.com) timelines. See
[ADR-0007](./adr/0007-gsap-timelines-own-motion.md) for why a library, why this
one, and what it replaced.

## The three mechanisms

Not everything that moves is a timeline, and the boundary matters more than the
library does. These three are disjoint, and all three answer to
[`src/utils/animations.ts`](../src/utils/animations.ts).

| Mechanism | Owns | Because |
|---|---|---|
| **GSAP timelines** | anything with a position in a sequence — panels, modals, page headers, boot's clock | sequenced, reversible, seekable |
| **CSS transitions** | state-flip feedback — hover, focus, selection, press | the browser resolves interruption natively |
| **CSS keyframes** | ambient infinite loops — background lines, loader spin | nothing sequences them |

The test for one vocabulary is not "one library". It is that these three do not
overlap and none of them escapes the seam.

### The boot sequence

Boot is on the timeline too, clock and gestures both. Its choreography lives in
[`src/utils/bootMotion.ts`](../src/utils/bootMotion.ts) rather than in
`motion.ts`, because boot is not written in the five primitives — it is where
they came from, and a triangle mesh panning in from black is not a Wipe or a
Domino.

`STAGE_HOLDS` and the tween durations are deliberately different numbers, and
that is not drift. A hold is how long a stage waits before handing over; a
duration is how long a gesture takes. The triangle mesh runs about 900ms
against a 700ms hold, so it is still painting itself in while the borders draw
over it — that overlap is boot reading as one construction rather than four
beats in a queue.

Boot's elements render from the first frame and are hidden by their own start
states, exactly as panels are. Nothing is gated on a stage any more, with two
exceptions that earn it: `CornerLines` unmounts once boot is `done`, and
`TriangleGrid` collapses its 480 polygons to a single rect at the same point —
cheaper, and it sidesteps the hairline seams anti-aliasing leaves between
adjacent same-coloured polygons.

## The model

Motion has two axes and one category that sits outside both.

### Primitives — what the motion looks like

The boot sequence spoke this language first; the panel layer had its own
translate-and-fade dialect and was brought into line rather than the other way
round. The names survived the move to GSAP unchanged.

| Primitive  | Motion                                   | Owns                                     |
|------------|------------------------------------------|------------------------------------------|
| **Wipe**   | `clip-path: inset()`, hard edge, no fade | panels, frames, modals                   |
| **Domino** | staggered slide-and-fade, per-item delay | card grids that fall into place          |
| **Ripple** | staggered opacity, per-item delay, no transform | groups that brighten in place — genre rows, segmented-track cells |
| **Growth** | `scaleX` from an anchored edge           | horizontal bars, rules, dividers         |
| **Decode** | glyph scramble locking left-to-right     | short uppercase chrome                   |
| **Fade**   | opacity only                             | prose, backdrops                         |

Three rules decide which to reach for:

- **Solid surfaces wipe.** A panel, a frame, a modal — anything with edges.
- **Fields fade.** A backdrop is a dimming field with no geometry to wipe.
- **If it wraps, it fades.** Decode is unreadable on a paragraph. It is for page
  headers, panel titles, readout labels and nav labels — not critique sections
  or notes.
- **A group that falls Dominoes; a group that fills in place Ripples.** Cards
  slide down as they arrive (Domino). The cells of a rating track are fixed
  segments and the genre rows sit in a list — they brighten where they stand
  (Ripple), they do not move. The two share a stagger; the transform is the line
  between them.

### Phase — entrance or exit

**Exit is the entrance reversed** (`tl.reverse()`), and that is the default.
There is no separate exit vocabulary and no second declaration.

This is a correctness rule, not a convenience. Every time a surface's motion has
been declared in two places in this repo, the two drifted: the frame and the
shadow it casts desynced because each call site gated them by hand, and the
`DURATIONS` table drifted ~2x from the CSS it was copied from. A reversed
entrance cannot disagree with its entrance.

A surface that genuinely needs a different departure can override it. Keep that
an exception — the moment overriding is routine, exits are being declared twice
again.

**A modal has to own when it leaves.** Use
[`Modal`](../src/components/common/Modal.tsx). Every call site used to write
`{open && <SomeModal/>}`, which takes the element out of the tree the instant
it closes; a component the parent has already unmounted has nothing left to
animate, which is why nothing in this app had an exit at all. Pass `open` and
keep it mounted. Where the modal describes a selection that goes null on close,
[`useRetained`](../src/hooks/useRetained.ts) holds the last value so the exit
plays over what the reader was looking at.

### Response — state-flip feedback

Hover, focus, selection, press. **Not a timeline**: it has no beginning or end,
it is driven by state rather than by a position, and it must be interruptible
mid-flight, because the pointer can leave at 40%.

Response is **CSS transitions** — Tailwind's `transition-*`, as it already was.
What changed is that it now has a name and answers to the seam. There are 93 of
these across 31 files; before they were named, none of them respected
`prefers-reduced-motion`, because only the vocabulary consulted
`animations.ts`. That was a correctness bug rather than a coverage gap.

## Timing sheet

Every number that sets how fast the app moves, in one place — consult this before
a site-wide timing change rather than hunting the values down. Seconds unless
noted.

### Primitives — [`src/utils/motion.ts`](../src/utils/motion.ts)

| Constant | Value | Sets |
|---|---|---|
| `WIPE_DURATION` | 0.32 | a solid surface's clip wipe |
| `GROWTH_DURATION` | 0.30 | a hairline / rule growing across |
| `DOMINO_DURATION` | 0.35 | one card's slide-and-fade |
| `DOMINO_STAGGER` | 0.03 | the gap between successive cards in a Domino wave |
| `RIPPLE_DURATION` | 0.28 | one item's in-place fade (genre row, track cell) |
| `RIPPLE_STAGGER` | 0.035 | the gap between successive items in a Ripple wave |
| `FADE_DURATION` | 0.24 | a prose or backdrop fade |
| `DECODE_PER_CHAR` | 0.055 | per-character scramble rate; a title's length sets the whole sequence's length, so this is the main pacing lever |

### Boot — [`src/utils/bootMotion.ts`](../src/utils/bootMotion.ts)

| Constant | Value | Sets |
|---|---|---|
| `LINES_HOLD` | 0.5 | the lines stage's hold before it hands over |
| `TRIANGLES_HOLD` | 0.7 | the triangle-mesh stage hold |
| `BORDERS_HOLD` | 0.5 | the border-draw stage hold |
| `NAV_HOLD` | 0.6 | the nav-items stage hold |
| `HEADER_HOLD` | 0.8 | the header stage hold — where the reveal signal is raised |
| `TRIANGLE_STEP` | 0.018 | stagger between triangles across the mesh |
| `TRIANGLE_PAIR_OFFSET` | 0.006 | offset between the two triangles in a cell |

A stage *hold* and a gesture *duration* are deliberately different numbers — a
hold is how long a stage waits before handing over, a duration is how long the
gesture takes — so they do not track each other. See the boot notes above.

### Overlap — per call site, by design

Beats overlap by a GSAP position argument on the primitive call: `"<0.2"` starts
200ms after the previous tween *began*. These are per-surface choices — a shelf
overlaps its beats differently from a modal — so they live at the call site, not
in a global. Grep `'<0` across `src/pages` and `src/components` to find them.

**To rescale the whole app's pace**, change the primitive durations (and, for the
intro, the boot holds). The overlaps are relative offsets and mostly scale with
the durations; the per-site ones are tuned by eye afterwards. If a single knob is
ever wanted, wrap the durations in one `SCALE` multiplier here — deliberately not
done yet, since the values are still being tuned per primitive.

## The reveal sequence

Every surface builds its timeline `paused: true` when it mounts, and plays it
when the boot timeline emits its signal.

**Building the timeline is what hides the surface.** GSAP's `.from()` applies
its start values the moment the tween is created, even while paused, so the
pre-state and the animation come from one declaration. There is no separate
gate — no `invisible` class, no "hidden but animating" state to get wrong.

That is the whole fix for the bug this design replaced. `visibility: hidden`
does not stop a CSS animation, so the old gate hid surfaces that were already
playing and every animation was spent before it was seen. An unplayed timeline
cannot spend itself.

```
boot ──────────────────────► signal
                              │
                              ├─► frame+shadow  ████████
                              │   bars              ████████
                              │   title                 ██████████
                              │   cards                     ████████████
                              └───────────────────────────────────────┘
```

Overlap is a position parameter (`"<0.2"` — start 200ms after the previous tween
began), not a reporting protocol. The version that bought overlap by having each
stage end on its *lead* element needed a latch and an escape list to do it.

The signal is **one-shot and latched**, not an event: a surface that mounts
after it has already fired plays immediately rather than waiting forever.

**A subject that arrives later needs `rebuildOn`.** GSAP resolves a selector
when the tween is created, not when it plays, so a timeline built at mount
addresses nothing if its subject comes with a fetch — and goes on addressing
nothing after the subject appears. A shelf's cards and a list's sections
therefore get their own timeline on their own readiness, keyed on `loading`.
The frame does not: rebuilding replays, and a frame that re-wipes because its
contents arrived is the flash this whole design exists to remove.

## The arrival grammar

Every animated surface follows one order, and its beats overlap in waves rather
than march one fully-finished beat at a time (the `"<0.2"` position convention
above). The content beat nests one level (ADR-0011): the section headers land as
a group, then each section's body fills in its own idiom.

```
Frame Wipe ─► Title Decode ─► Section Headers Decode (group) ─► per section:
                                                                   Header
                                                                   Items Ripple
                                                                   Hairline Grow
```

A surface omits a beat it has no elements for, but never reorders them. The
section bodies overlap in waves, each a beat behind the one above it, so on a
Category shelf the genre rows, the rating cells and the cards fill concurrently
rather than one finished section at a time. Plugging a new surface's content into
this order — by giving its elements the `data-*` markers the beats address
(`data-section` around each section, `data-section-header` on its bar,
`data-ripple-item` on its items, `data-hairline` on its rule) — is what makes it
animate correctly by default.

**The section bodies are split across several timelines**, by what replays on a
Category toggle (ADR-0011): the headers and rating cells are stable chrome keyed
on nothing, the genre rows and released track and cards are volatile and keyed on
what changed. Because every timeline starts at t=0 on the reveal signal, a body
wave positioned at an **absolute** second (`HEADERS_LEAD + index * SECTION_STEP`)
lines up with the others across timeline boundaries — the one place a reveal uses
an absolute position rather than a relative `<` offset.

**Arrival is a first-class moment: a surface re-runs its entrance every time you
arrive at it**, not only on first load. A page that is a distinct route
re-animates because navigating to it remounts it. A component shared across
routes — the Category shelf — keys its *content* timelines on the thing that
changed (the Category) so they replay, while keeping its *frame* keyed on
nothing, so the frame is stable chrome that wipes once and persists across
toggles rather than re-wiping. A heading whose text changes without a remount
keys its Decode on that text, or it will not track the change. See ADR-0010.

## Panels

Use [`Panel`](../src/components/common/Panel.tsx). It draws the frame and the
offset shadow it casts as one object, under one timeline.

They used to be sibling elements at every call site, each gated by hand, and
`Now` gated them differently from the rest — the shadow animated in while the
frame was still `invisible`, so the shadow arrived before the thing casting it.
A caller can no longer desync them because a caller can no longer address them
separately.

**`Panel` mounts unconditionally.** It does not wait for data; `Loader` renders
inside the frame and content fills in when the fetch resolves. A panel that
waits for data reveals late and out of rhythm with boot, and the codebase had
already made this call in the other branch of the same fetch — a failed fetch
keeps the frame and reports inside it, rather than replacing the page with a
line of text. Loading is the same argument.

`Panel` owns only motion. Size, background and borders stay with the caller:
`Desktop` is `bg-nier-50` where the rest are `bg-nier-100`, and a default baked
into the component would put two competing `bg-*` classes on one element, where
the winner is decided by stylesheet order rather than by the caller.

## Turning motion off

Everything asks [`src/utils/animations.ts`](../src/utils/animations.ts), never
the env var directly. Three inputs, in precedence order:

1. the **runtime override** — the dev chords below
2. **`prefers-reduced-motion`** — a standing preference from the OS
3. **`VITE_DISABLE_ANIMATIONS`** — the build-time default, set in `.env.local`

The override outranks the media query deliberately: it exists so you can turn
motion *on* to look at it, and a machine set to reduce motion would otherwise
make that impossible. This is why `gsap.matchMedia()` is not used for it —
matchMedia is purely query-driven and cannot express an override that beats the
query.

Motion off is **not a separate code path**. The timeline is built exactly as it
would be, then set to `progress(1)` — final state, zero duration. The resting
state cannot drift from the animated one, because it is produced by the same
declaration. It used to be three separate branches in three files, and one of
them did not check the flag at all.

Response is gated differently, because it is not a timeline: the seam puts a
`motion-off` class on the document element, and one rule suppresses transition
durations beneath it.

**The boot sequence is silenced too.** `prefers-reduced-motion` skips boot to
its final frame like any other timeline — `BootSequenceContext` seeks it to
`progress(1)`, which fires every stage callback in order and lands the app on
`done` with no play. It was once left ungated on the grounds that boot sat
outside the vocabulary's remit; that reason went when boot became a timeline
like any other, and a ~2.3s animated intro is exactly what a reduced-motion
preference asks not to sit through. The dev chords still turn motion on to watch
it. (This was the one open question this file used to record; it is resolved.)

`VITE_DISABLE_ANIMATIONS` is build-time, so changing it means restarting Vite.
It is unset in the production build, which is why these animations have always
run in production regardless of what `.env.local` said locally.

## Dev chords

| Chord        | Effect                             |
|--------------|------------------------------------|
| `Ctrl+Alt+M` | turn motion on/off in place        |
| `Ctrl+Alt+R` | replay the current page's reveal   |

Alt rather than Shift because `Ctrl+Shift+R` is the browser's hard-reload and
`Ctrl+Shift+M` is DevTools' device toolbar — both reserved shortcuts a page
cannot cancel. Guarded by `import.meta.env.DEV`, so they drop out of a
production build entirely.

GSDevTools gives a real scrub bar and is the better tool for tuning a ~1.1s
sequence. It is 22 KB, so it belongs behind a dev-only dynamic `import()`, where
Vite drops it from the production build entirely.

## Things that will surprise you

- **`.from()` fires on creation, not on play.** That is deliberate and load-
  bearing — it is what makes an unplayed timeline hide its own subject. It also
  means creating a timeline has a visible side effect, so create it where you
  intend the element to be hidden.
- **Decode is the long pole.** A panel's title sets the length of the whole
  sequence — about 1025ms for `CURRENT VIEW PANEL`. The lever for overall pacing
  is the scramble's per-character rate, not the sequence.
- **Tests seek, they do not tick.** `tl.progress(0.5)` applies that frame
  synchronously. Do not reach for fake timers: the suite this replaced had five
  vacuous assertions because `performance.now` is not faked, and needed an
  `AnimationEvent` polyfill loaded before React because jsdom has neither
  `AnimationEvent` nor `TransitionEvent` and React picks its native event name
  at import time.
- **The regression test worth keeping.** A panel that mounts *before* the boot
  signal must still be at `progress === 0` when the signal arrives. The bug this
  design replaced was not wrong values — it was right values, spent too early,
  and no test that mounts a panel with the signal already fired can see it.
