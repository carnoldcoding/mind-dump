---
status: superseded
superseded-by: 0007
---

# A panel's reveal advances on events, not elapsed time

> **Superseded by [ADR-0007](./0007-gsap-timelines-own-motion.md).** Motion is
> built as GSAP timelines now, so a stage's timing lives with its sequence
> rather than being reported by the elements themselves. The two drift
> measurements below still stand and are still the best evidence in this repo
> for why duplicated timing is dangerous — 0007 answers the same question
> differently, by giving the durations one home instead of no home.

`usePanelReveal` staged a panel in three beats — the box animates in, its title decodes, its cards arrive — and it drove them from a table of durations:

```ts
const DURATIONS = {
  box: 450,   // matches .nier-enter's own duration
  title: 500, // rough decode duration for a typical panel title
  cards: 500, // stagger window for the card grid
};
```

Those numbers were hand-copied from CSS in another file, and from a hook in a third. Both of the copies had drifted, and neither drift was visible from the file that held them:

- **Title.** `useDecodeText` locks character `i` at `i * 55ms` plus up to 90ms of jitter. `CURRENT VIEW PANEL` is 18 characters, so the decode runs about 1025ms against the 500ms allowed — roughly 2x. The card domino started while the title was still scrambling.
- **Cards.** Each card is delayed `min(i, 20) * 30ms` and falls for 350ms, so a full Category shelf finishes at about 950ms against the same 500ms. The sequence declared itself `done` while cards were still moving.

Both stages had been wrong since they were written. Nothing failed loudly, because a stage machine disagreeing with its own animations only ever looks like the animations are slightly off.

Stages now advance when an element reports that it actually finished: the frame's wipe ends the `box` stage via `animationend`, the title's decode ends `title` via a completion callback, the first card's domino ends `cards`. The hook knows no durations at all, so retuning a keyframe needs no change in it.

## Why the *lead* element, not the last

A stage ends when its **first** element reports, not its last. A twelve-card domino therefore keeps running underneath whatever comes next, and the panel reads as one machine coming online rather than as four separate beats waiting politely for each other. Ending on the last element would have been the obvious reading of "in sequence", but it also stacks every stage's full duration end-to-end — about 2.3s on a full shelf, against roughly 1.1s for the overlapping version.

The alternative way to get overlap is to start stage N+1 at some percentage of stage N, which puts timing knowledge back in the hook and re-opens exactly the drift this decision closes. Reporting on the lead element buys the overlap with no numbers at all.

## Why not simply widen the numbers

Setting `cards: 950` would have fixed the observable bug in one line. It leaves the constants hand-synced, so the next keyframe edit silently reintroduces the drift — and the drift is invisible until someone counts characters in a title or cards in a grid.

## Consequences

- Every stage needs something that reports it. Where nothing does — a panel with no decoded title, or no card domino — the caller passes those stages in `unreported` and they advance on entry. That list is a to-do: it shrinks as each surface gains a real Growth or Domino element.
- A stall guard is now necessary. If an element never reports — it was `display:none`, its animation was interrupted, the event was dropped — the stage would otherwise hang forever. `STALL_GUARD_MS` is deliberately far longer than any real stage so it never wins a race with the animation it guards.
- `animationend` bubbles, so anything listening for its own animation must check `event.target === event.currentTarget`. Without it, every card finishing inside a panel is read as the panel's own wipe landing. `Panel` does this; so must any future reporter.
- Tests can no longer advance a clock to walk the sequence. They call `advance(stage)` directly, which is closer to what the browser does anyway.
- jsdom implements no `AnimationEvent`, and React picks its native event name at import time by asking whether `window.AnimationEvent` exists. Without it React binds `webkitAnimationEnd`, and a test firing `animationend` reaches nothing at all — silently, with the assertion passing vacuously. `src/test/setup.ts` installs the constructor before React loads.
