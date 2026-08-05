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
| **GSAP timelines** | anything with a position in a sequence — panels, page headers, boot's clock | sequenced, reversible, seekable |
| **CSS transitions** | state-flip feedback — hover, focus, selection, press | the browser resolves interruption natively |
| **CSS keyframes** | ambient infinite loops — background lines, loader spin | nothing sequences them |

The test for one vocabulary is not "one library". It is that these three do not
overlap and none of them escapes the seam.

### Not migrated yet

Three things this vocabulary claims but does not yet own. They are work, not
exceptions — nothing below is an argument for leaving them:

- **Modals** still carry `nier-modal-enter` / `nier-backdrop-enter` classes and
  `enterClass`. They need a shared `Modal` that owns its own presence first,
  because every call site unmounts them with `{open && <Modal/>}` and a
  component removed from the tree cannot play an exit.
- **Exit** therefore exists as a rule here and nowhere in the code.
- **Boot's own visuals** are still CSS keyframes, which is why
  `STAGE_DURATIONS` in `BootSequenceContext` still describes durations it does
  not own. Boot's *clock* is a timeline; its corner lines, triangle grid,
  border wipes and nav domino are not.

## The model

Motion has two axes and one category that sits outside both.

### Primitives — what the motion looks like

The boot sequence spoke this language first; the panel layer had its own
translate-and-fade dialect and was brought into line rather than the other way
round. The names survived the move to GSAP unchanged.

| Primitive  | Motion                                   | Owns                                     |
|------------|------------------------------------------|------------------------------------------|
| **Wipe**   | `clip-path: inset()`, hard edge, no fade | panels, frames, modals                   |
| **Domino** | staggered entrance, per-item delay       | card grids, list rows, nav items         |
| **Growth** | `scaleX` from an anchored edge           | horizontal bars, rules, dividers         |
| **Decode** | glyph scramble locking left-to-right     | short uppercase chrome                   |
| **Fade**   | opacity only                             | prose, backdrops                         |

Three rules decide which to reach for:

- **Solid surfaces wipe.** A panel, a frame, a modal — anything with edges.
- **Fields fade.** A backdrop is a dimming field with no geometry to wipe.
- **If it wraps, it fades.** Decode is unreadable on a paragraph. It is for page
  headers, panel titles, readout labels and nav labels — not critique sections
  or notes.

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

### Response — state-flip feedback

Hover, focus, selection, press. **Not a timeline**: it has no beginning or end,
it is driven by state rather than by a position, and it must be interruptible
mid-flight, because the pointer can leave at 40%.

Response is **CSS transitions** — Tailwind's `transition-*`, as it already was.
What changed is that it now has a name and answers to the seam. There are 93 of
these across 31 files; before they were named, none of them respected
`prefers-reduced-motion`, because only the vocabulary consulted
`animations.ts`. That was a correctness bug rather than a coverage gap.

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

**Open:** whether the seam should silence the **boot sequence**. It was
deliberately ungated before, on the grounds that it was outside the
vocabulary's remit — that reason is gone now that it is a timeline like any
other, and a ~2.3s animated boot is exactly what someone asking for reduced
motion is asking not to sit through. Left as it was until decided, rather than
changed in passing.

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
