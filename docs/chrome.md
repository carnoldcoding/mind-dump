# Chrome

The visual grammar this app's surfaces are drawn in, and where each part of it
already lives in code.

It is written down because "make it look like the reference" was, until now, a
thing you could only answer by opening screenshots and guessing. Motion has had
[`motion.md`](./motion.md) for a while; this is the same job for the parts that
do not move.

This is **not** domain vocabulary. [`CONTEXT.md`](../CONTEXT.md) is a glossary
of what the collection contains — a Caret is not a thing a Review has, so it
does not belong there.

## Palette

Seven variables in [`index.css`](../src/index.css), and nothing outside them.

| Token | Used for |
|---|---|
| `--color-nier-50` | the deepest surface — Desktop, the nav and footer bands |
| `--color-nier-100` | ordinary panel surfaces |
| `--color-nier-100-lighter` | inputs, and surfaces that sit on top of a panel |
| `--color-nier-150` | headers, dividers, the pressed and hovered state of a bar |
| `--color-nier-shadow` | the offset a panel casts |
| `--color-nier-dark` | inverted backgrounds, and the frame's own line |
| `--color-nier-text-dark` / `--color-nier-text-light` | text on light, text on inverted |

## Type

Six semantic steps in [`index.css`](../src/index.css), and nothing outside them:
every text site maps to one of these rather than picking a raw size. They
generate the `text-*` utilities named below. The floor is 12px — nothing renders
smaller. Before this the app carried ~14 ad-hoc sizes, ~70 of them under 12px,
down to 8px, which is why so much of it strained to read.

| Token | Size | Used for |
|---|---|---|
| `text-display` | 48px desktop / 36px mobile | page titles |
| `text-title` | 24px | window and modal headers |
| `text-heading` | 18px | card titles, subsections |
| `text-body` | 16px | prose, field values, inputs |
| `text-label` | 14px | form labels, secondary meta |
| `text-eyebrow` | 12px | the uppercase letter-spaced micro-labels |

Two rules that keep it a system rather than a list:

- **The tokens own their responsiveness.** Only `text-display` changes by
  device, and it does so inside the token — a call site never writes a `md:`
  size variant. Body and below are one size on every device.
- **16px inputs.** `text-body` is 16px, and an unlayered mobile rule floors
  every form control at 16px, which is the size iOS Safari needs to not zoom the
  viewport on focus. Do not give an input a smaller step.

## Scroll and overlays

The app is a fixed-viewport shell: the page never scrolls, and all scrolling
lives in one container, `#app-scroll`, between the fixed nav and footer. See
[ADR-0009](./adr/0009-fixed-viewport-shell.md) — it is worth reading before
building a surface that scrolls, because the surface must scroll *inside* a
bounded container, not by growing the page.

Every overlay obeys one contract: a dimming `bg-nier-dark/40` backdrop, plus a
freeze of `#app-scroll` (`useScrollLock`) while open, so the page behind it
neither moves nor shows through. Reach for the shared [`Modal`](../src/components/common/Modal.tsx)
and it comes for free. A bespoke overlay (the mobile filter menu, the nav
drawer) must call `useScrollLock` itself and lay its own backdrop.

Dismissal is a per-overlay flavor: light overlays (Search, filters, the drawer)
close on a press outside them; form editors pass `dismissOnOutsidePress={false}`
so they dim and lock but dismiss only by their close control or Escape — a stray
tap outside a form must not discard an edit.

## The parts

### Frame and shadow

Every solid surface is a frame with a hard-edged copy of itself offset one
pixel down and right. They are drawn together as one object, never gated
separately — see [`Panel`](../src/components/common/Panel.tsx) for page
surfaces and [`Modal`](../src/components/common/Modal.tsx) for modals.

**A modal already has one.** `Modal` renders the offset itself, so putting a
`Panel` inside one draws a second shadow. Panel is for page surfaces; Modal is
for modals.

### Dot rule

A hairline with a repeating pattern strip beneath it, marking the edge of a
band. `.nier-dot-pattern` in [`custom.css`](../src/styles/custom.css) reserves
the space inside its own box rather than using a real border, so a clip-path
wipe over the parent reveals the rule along with everything else instead of
letting it pop in afterwards.

Worn by the nav bar, the footer band, and the Review editor's section bar.

### Inverted

The selected item in a set: `bg-nier-dark` with `text-nier-text-light`, against
siblings that are plain. The set keeps its shape — inverting is the only thing
that changes.

Inverting is **selection**, so it is a CSS transition and not a timeline. See
`motion.md` on Response.

### Dimmed

Present, in place, and unusable: `opacity-35` with `cursor-default`.

The rule is that **an unavailable thing keeps its slot**. Removing it would
reflow the set under the pointer and would hide that the capability exists at
all. A dimmed thing should be able to say why it is dimmed when asked —
`hintFor` in [`tabs.ts`](../src/pages/System/components/ReviewPanel/tabs.ts)
carries that copy for the editor's sections.

### Caret

`➤` in the margin, marking where attention is. The reference marks its selected
row; a form has no selected row but has a focused field, which is the same
statement.

Drawn with `focus-within` rather than tracked in state — it is Response, and it
has to keep up with focus that can move mid-gesture. The margin is reserved
whether or not the caret is showing, so nothing shifts sideways as focus
arrives. See [`FieldRow`](../src/pages/System/components/ReviewPanel/FieldRow.tsx).

### Hint bar

The band along the bottom of a surface, describing whatever is under the
cursor. Actions sit at the far end of it.

The voice is the reference's: **flat third person, verb first** — "Registers
the name this Review is filed under", not "Here you can set the title". It
reads as the interface describing itself rather than addressing a reader, which
is the whole effect.

Hint copy **never counts**. A line reporting how many Critique sections were
written would put a figure on a Critique that `CONTEXT.md` is explicit should
not carry one.

### Section glyphs

A geometric mark per Critique section, in `SECTION_GLYPH`
([`critique.ts`](../src/utils/critique.ts)). Shared between the Review detail's
tabs and anywhere else a section is named, so one section looks the same
wherever it appears.
