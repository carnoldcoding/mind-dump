# Motion

How this app animates. Vocabulary and rules live here rather than in
[`CONTEXT.md`](../CONTEXT.md), which is a domain glossary and stays free of
implementation — a Wipe is not a thing the collection contains.

Everything is hand-written CSS keyframes in
[`src/styles/animations.css`](../src/styles/animations.css) plus a small amount
of JS staging. There is no motion library and no reason to add one.

## The five primitives

The boot sequence already spoke this language; the panel and modal layer used
to have its own translate-and-fade dialect, and was brought into line rather
than the other way round.

| Primitive  | Motion                                   | Owns                                     | Class            |
|------------|------------------------------------------|------------------------------------------|------------------|
| **Wipe**   | `clip-path: inset()`, hard edge, no fade | panels, frames, modals                   | `.nier-wipe`     |
| **Domino** | staggered entrance, per-item delay       | card grids, list rows, nav items         | `.nier-domino`   |
| **Growth** | `scaleX` from an anchored edge           | horizontal bars, rules, dividers         | `.nier-grow-x`   |
| **Decode** | glyph scramble locking left-to-right     | short uppercase chrome                   | `useDecodeText`  |
| **Fade**   | opacity only                             | prose, backdrops                         | `.nier-fade`     |

Three rules decide which to reach for:

- **Solid surfaces wipe.** A panel, a frame, a modal — anything with edges.
- **Fields fade.** A backdrop is a dimming field with no geometry to wipe.
- **If it wraps, it fades.** Decode re-renders every character every 45ms and
  is unreadable on a paragraph. It is for page headers, panel titles, readout
  labels and nav labels — not critique sections or notes.

Durations are custom properties (`--nier-wipe-duration`,
`--nier-domino-delay`, …), so a surface tunes its own pacing without a second
keyframe.

## The reveal sequence

A panel reveals in stages, and each stage ends when its **lead** element
reports that it finished — the first one, not the last — so a stage's tail
overlaps the next one:

```
frame+shadow  ████████
bars              ████████
title                 ██████████
cards                     ████████████
              └────────────────────────┘  ~1.1s
```

`usePanelReveal` holds no durations. See
[ADR-0006](./adr/0006-event-driven-panel-reveal.md) for why, and for the two
2x drifts that came of the version that did.

Where a surface has nothing to report a stage — no decoded title, no card
domino — it passes that stage in `unreported` and the stage advances on entry.
**That list is a to-do, not a fixture**: it shrinks as each surface gains a
real element to report with.

## Panels

Use [`Panel`](../src/components/common/Panel.tsx). It draws the frame and the
offset shadow it casts as one object, under one gate and one wipe.

They used to be sibling elements at every call site, each gated by hand, and
`Now` gated them differently from the rest — the shadow animated in while the
frame was still `invisible`, so the shadow arrived before the thing casting
it. A caller can no longer desync them because a caller can no longer address
them separately.

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
make that impossible.

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

## Things that will surprise you

- **`animationend` bubbles.** Anything listening for its own animation must
  check `event.target === event.currentTarget`, or every card finishing inside
  a panel reads as the panel's own wipe landing.
- **jsdom has no `AnimationEvent`.** React picks its native event name at
  import time by asking whether `window.AnimationEvent` exists; without it,
  React binds `webkitAnimationEnd` and a test firing `animationend` reaches
  nothing — silently. `src/test/setup.ts` installs the constructor before React
  loads. Do not remove it.
- **Decode is the long pole.** A panel's title sets the length of the whole
  sequence — about 1025ms for `CURRENT VIEW PANEL`. The lever for overall
  pacing is `PER_CHAR_MS` in `useDecodeText`, not the stage machine.
- **The boot sequence is deliberately not gated** by the motion flag, and is
  not part of this vocabulary's remit — it is where the vocabulary came from.
