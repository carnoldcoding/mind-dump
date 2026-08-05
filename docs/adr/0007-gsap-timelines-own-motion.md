---
status: accepted
supersedes: 0006
---

# Motion is built as GSAP timelines, not as CSS classes the browser plays

A panel revealed by putting a class on an element and waiting for the browser to tell us it had finished. On a page refresh that produced this:

```
t=0      Panel mounts, ready=false, wipe STARTS behind visibility:hidden
t=320    wipe ENDS unseen → animationend fires → advance('box') → stage 'title'
t≈1345   decode ends unseen → 'cards' → 'done'
         ── the panel is fully "revealed" and nobody has seen a frame of it ──
t=2300   boot reaches 'header' → `invisible` drops → PANEL POPS IN, fully drawn
t=2300   reveal resets to 'box', but the wipe already ran and cannot re-fire
t=4300   STALL_GUARD_MS expires → 'title'
t≈5325   title finally settles
```

Two seconds of dead air, and a panel that arrives by appearing rather than by animating. Both are the same fault: **`visibility: hidden` does not stop a CSS animation.** The gate hid an element that was already playing, so every animation in the sequence was spent before it was visible, and the only thing left to drive the machine was the stall guard — a 2000ms timeout written specifically never to win a race, winning every one.

The root cause is not the gate. It is that **element mount is the start signal and the browser owns the clock.** Nothing in that arrangement can express "exists, but has not begun". A timeline can: it is constructed, held paused, and played when we say. An animation that has not been played cannot have spent itself.

## What 0006 got right, and what it got backwards

ADR-0006 found a real defect and diagnosed it correctly. A `DURATIONS` table in `usePanelReveal` was hand-copied from CSS in another file and a hook in a third, both copies had drifted roughly 2x, and nothing failed loudly because a stage machine disagreeing with its own animations only looks like the animations are slightly off. That analysis stands, and the two measurements in it are still the best evidence in this repo for why duplicated timing is dangerous.

Its remedy was to let the hook hold **no** durations and advance on reported events instead. This decision inverts that: the timeline holds **all** the durations, in exactly one place.

Those look opposed and are not. Both are answers to the same question — where is the single source of truth for timing — and 0006 could only answer "not here", because the other candidate was a stylesheet that JavaScript cannot read. Choosing events was choosing the only seam available. A timeline gives a third answer that neither file had: the durations and the sequence are the same object, so there is nothing to sync and nothing to drift.

What that eliminates, all of it machinery that existed only to compensate for not owning the clock:

| Removed | Why it existed |
|---|---|
| `STALL_GUARD_MS` | `animationend` might never arrive |
| the `spent` ref latch | twelve dominoes would each push the stage forward |
| `unreported: PanelStage[]` | some surfaces have nothing to report a stage with |
| `event.target === event.currentTarget` | `animationend` bubbles |
| `src/test/setup.ts` | jsdom has no `AnimationEvent`; React silently binds `webkitAnimationEnd` |
| `useDecodeText`'s `onDone` ref | a `setInterval` cannot emit `animationend` |

## Why a library at all

The strongest argument is not ergonomics. It is that `usePanelReveal` was already a timeline — 130 lines of one, written longhand, with a stall guard where a duration should be. So was `BootSequenceContext`, which accumulates `elapsed` across five `setTimeout`s from a `STAGE_DURATIONS` table: the very durations-in-JS shape 0006 banned one file over, living unremarked in another.

And the bug lived on the seam between those two hand-rolled clocks. The panel waited on boot's `setTimeout` chain while its own animations ran on the browser's, and nothing reconciled them.

## Why GSAP

Weighed against Motion (motion.dev, the Framer Motion successor), which was the serious alternative.

GSAP's timeline is an addressable object: position parameters express overlap declaratively (`"<0.2"` — start 200ms after the previous tween began), and `seek()`, `restart()` and `timeScale()` come with it. The overlap point matters most. 0006 achieved overlap by ending each stage on its *lead* element rather than its last, which is an ingenious way to buy overlap with no numbers — and it needed a reporting protocol, a latch, and an escape list to do it. As a position parameter it is one string with no protocol at all.

`seek()` is the second reason, and it is about tests. A timeline can be moved to any point synchronously: no clock, no `requestAnimationFrame`, no fake timers, no events. The suite this replaces needed an `AnimationEvent` polyfill installed *before React imports*, and still had five vacuous `ReviewDetail` assertions for a while because decode never settled under fake timers — `performance.now` is not faked.

Motion is the better fit for React-idiomatic declarative work and its `AnimatePresence` is a cleaner exit story than ours will be. It was rejected because its orchestration is a variant tree rather than an addressable timeline, and an addressable timeline is precisely what the broken code was failing to hand-roll.

Cost: **~28.4 KB gzipped** (`gsap` 27.6 + `@gsap/react` 0.8), against a 179 KB bundle. ScrambleTextPlugin adds 3.9 KB and deletes `useDecodeText` outright.

## Why not simply fix the gate

Withholding the animation class until `ready`, rather than hiding an element that is already animating, fixes the observable bug and adds no dependency. It was the leading option before the library question was asked, and it is a real one.

It leaves every row of the table above in place. It also leaves the two-clock seam, which is where this fault came from and where the next one will: any future surface that needs to start after something else must either re-derive the reporting protocol or hand-copy a duration, and those are the two failure modes this repo has already shipped.

## The boundary

GSAP does not own everything that moves.

**GSAP owns anything with a timeline position** — sequenced, reversible, seekable. Panels, modals, the boot sequence, page and prose entrances.

**CSS transitions own anything driven purely by a state flip** — hover, focus, selection, press. There are 93 of these in 31 files today. Reimplementing them in GSAP would be worse, not better: interruption is the whole problem with hover, since the pointer can leave at 40%, and the browser's transition engine already resolves that natively from whatever the current computed value happens to be. Doing it by hand means 93 pairs of event handlers and a class of bug the browser does not have.

**Plain CSS keyframes keep ambient infinite loops** — the diagonal background lines, the loader spin. Nothing sequences them and nothing needs to address them.

The test for "one vocabulary" is not "one library". It is that these three are disjoint and all three answer to `src/utils/animations.ts`.

## Consequences

- **`animations.ts` stays the seam, and its API changes.** It stops returning class names (`enterClass`, `useEnterClass`) and exposes the policy instead. The three inputs and their precedence — runtime override beats `prefers-reduced-motion` beats `VITE_DISABLE_ANIMATIONS` — are unchanged and still deliberate.
- **Motion-off stops being a separate code path.** It was three branches in three files, and one of them (`useDecodeText`) simply did not check the flag at all until the commit before this one. A disabled timeline is now built identically and set to `progress(1)`, so the final state cannot drift from the animated one because it is produced by the same declaration.
- **The 93 Tailwind transitions come under the seam** via a single `motion-off` class on the document element. They were never gated before, so `prefers-reduced-motion: reduce` did not suppress them. That was a correctness bug, not a coverage gap.
- **Exit becomes a phase, not a primitive.** A surface's departure is its entrance reversed. Declaring exits separately is how the frame and its shadow desynced, and how the `DURATIONS` table drifted; reverse-by-default makes the common case incapable of disagreeing with itself. A surface that genuinely needs a different exit can still override.
- **Panels no longer wait on data to reveal.** `Panel` mounts unconditionally and `Loader` moves inside the frame, so the reveal stops depending on network latency. This makes loading consistent with error, which already refuses to throw the frame away — the same argument applied to only one of the two branches of the same fetch.
- **Tests seek rather than tick.** Build the timeline, `seek()` to a position, assert. `src/test/setup.ts` is deleted, and the six surface suites that fire `animationend` by hand are rewritten.
- **The dev chords survive and improve.** `Ctrl+Alt+R` becomes `restart()`, `Ctrl+Alt+M` rebuilds. GSDevTools (22 KB) can be added behind a dev-only dynamic `import()` for a real scrub bar at no production cost.
- **The boot sequence is now in scope.** 0006 and `docs/motion.md` both treated it as outside the vocabulary's remit — it was where the vocabulary came from. It is a timeline like any other now, and it is the one that emits the signal every surface waits on.
