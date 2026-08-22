---
status: accepted
---

# The app is pinned to the viewport; one container scrolls, and overlays freeze it

The page used to scroll as an ordinary document. The nav band was fixed to the
top and the Readout footer fixed to the bottom, but `<main>` sat in normal
flow, so when its content ran past the viewport the whole document scrolled and
slid *under* the two fixed bands.

On a desktop with a mouse this reads as normal. On a phone it does not: a touch
anywhere is a drag on the document, so trying to scroll a list inside a panel
dragged the entire page instead, and an open modal, filter menu, or nav drawer
left the page behind it scrolling — the background lurched while you read the
thing on top. The app is meant to read as a desktop-environment simulation
without movable windows, and a document that scrolls behind fixed chrome is the
opposite of that.

## Decision

The page itself never scrolls, at any breakpoint. The root chain
(`html, body, #root, #nier-grid`) is pinned to `100dvh` with `overflow: hidden`,
and all scrolling lives in a single container, `#app-scroll`, between the fixed
nav and the fixed footer. The bands overlay its top and bottom; the page's own
nav spacer and `.nier-page-bottom` keep content clear of them.

Every overlay obeys one contract: it lays a dimming backdrop (the existing
`bg-nier-dark/40` field) **and** freezes `#app-scroll` while it is open, so the
page behind it is inert in both senses — it neither moves nor shows through
clean. The freeze is a `.scroll-locked` class toggled by a ref-counted
`useScrollLock`, so two overlays open at once do not let the first to close
unfreeze the page under the second.

Dismissal is a per-overlay flavor, not a second mechanism:

- **Light overlays** — Search, the filter menu, the nav drawer — close on a
  press outside them.
- **Form editors** — the Review editor, and the New/Edit Movement, Edit Entry,
  and Mod modals — dim and lock but dismiss only by their close control or
  Escape, because a stray tap outside a form should not throw away an editing
  session.

## Consequences

- `ScrollRestoration` acted on window scroll, which no longer moves. It is
  replaced by resetting `#app-scroll` to the top on navigation. Scroll
  *restoration* proper (remembering a position across a back navigation) is
  given up; "each page opens at its top" is kept.
- `position: sticky` inside a page sticks relative to `#app-scroll` now, which
  is the nearest scrolling ancestor — the behavior a page author expects.
- A fixed viewport breaks the ordinary "content taller than the screen just
  scrolls" expectation. Anything that needs to scroll must live inside a
  bounded container with its own overflow, not lean on the document growing.
- The mobile nav drawer keeps its slide-from-right motion; the contract wraps a
  backdrop around it rather than changing how it moves. That backdrop also
  rescued the drawer's close: the open drawer overlapped the × in the bar, and
  a press off the drawer now closes it.
- Modals continue to portal to `document.body`, which is outside `#app-scroll`,
  so freezing the container never freezes the modal's own inner scroll.
