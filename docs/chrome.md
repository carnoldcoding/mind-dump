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
