---
status: accepted
---

# The arrival grammar nests: section headers, then per-section bodies

The arrival grammar (ADR-0007, `docs/motion.md`) was four beats — Frame Wipe,
Title Decode, Hairlines Grow, Content Domino — with the whole of a surface's
content in that last beat. On a Category shelf that meant the entire filter
column, four section headers and three segmented controls and a search line,
was simply present the instant the frame landed; only the genre rows and the
cards had an entrance. The intended feel is a finer one: the panel arrives, the
section headers land together, then each section's contents fill in their own
idiom — genre rows one after another, rating cells one square at a time, the
search underline growing, the cards falling — a wave travelling down and across
the surface.

## Decision

The content beat nests one level. The grammar becomes:

```
Frame Wipe -> Title Decode -> Section Headers Decode (group) -> per section:
                                                                   Header
                                                                   Items Ripple
                                                                   Hairline Grow
```

- **Section headers Decode as one group beat.** A section's dark bar is a panel
  title one level in, so it Decodes by the same rule as the top title, and all
  of them share a start time so they land together. A header is a group member
  because it carries `data-section-header`; a new section joins for free.
- **A new primitive, Ripple, fills the bodies that brighten in place.** Genre
  rows and the cells of a segmented track fade in one after another without
  sliding — Ripple is staggered opacity, no transform. Cards keep Domino (they
  fall); the search underline keeps Growth. The other five primitives named
  neither a staggered pure-fade (Fade has no stagger) nor an in-place one
  (Domino slides).
- **Sections are marked, not hand-choreographed.** Each section is a
  `[data-section]` carrying `[data-section-header]`, `[data-ripple-item]` and its
  own `[data-hairline]`. The bodies overlap in waves, each section a beat behind
  the one above it, positioned per call site as the existing overlaps already are.

## The bodies are split across timelines by what replays

ADR-0010's split — stable chrome keyed on nothing, volatile content keyed on the
Category — recurses into the sections. Which section is stable is decided by
whether its content changes across Categories:

- **Stable (keyed on nothing, plays once on arrival):** the always-present
  headers (GENRE, RATING, SEARCH, SHELF), the Rating cells (the 0–5 scale is the
  same every Category), the structural hairlines.
- **Volatile (keyed on the Category / the fetch):** the panel title, the genre
  rows (keyed on the visible genre set), the RELEASED and FINISHED sections
  (which appear and disappear with the data), the cards.

So a Category toggle replays only the genre rows, the released/finished tracks,
the cards and the title. The headers and Rating cells stay exactly as the frame
stays — re-Decoding a header that reads RATING before and after is motion that
reflects no change, and rapid tab-switching would strobe it.

This is why the section reveal is several `useRevealTimeline` calls rather than
one walk over `[data-section]`: the sections have different readiness (genres
arrive with the fetch) and different replay keys, and a single Category-keyed
timeline would replay the stable chrome on every toggle. The down-column wave
still reads as one sequence because every timeline starts at t=0 when the reveal
signal fires, so a body wave's **absolute** position (`HEADERS_LEAD + index *
SECTION_STEP`) is a shared clock the separate timelines line up against — not the
relative `<` offset a single timeline would use.

## Consequences

- `ripple` and `decodeGroup` join the primitive vocabulary in `motion.ts`;
  `docs/motion.md` carries the Ripple row and constants and the nested grammar.
- The grammar degrades cleanly: a surface with one section, or none, omits the
  beats it has no elements for. A two-field editor is a one-section instance of
  the same grammar, which is what makes the site-wide rollout tagging rather than
  re-authoring.
- The RELEASED/FINISHED sections are present-conditional — a shelf with nothing
  dated has no Released section — so their headers cannot build at mount with the
  always-present ones. But the header text ("RELEASED") does not change between
  two Categories that both have the section, so keying them on the Category would
  re-scramble unchanged chrome on every toggle, the thing the stable/volatile
  split exists to prevent. They instead ride a third key: **whether the section
  exists** (`releaseSpans.length > 0`). The header then Decodes exactly once, when
  its section first appears, and stays put across toggles — at position 0, so it
  still lands in the arrival group beat. Only the section's *cells* (whose spans
  do differ by Category) ride the volatile `[loading, category]` timeline.
- Absolute positions are load-bearing here in a way relative offsets are not:
  changing a section's `index` moves its wave; the per-call-site offsets are
  tuned by eye afterwards, as the existing ones are.
