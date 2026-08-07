---
status: accepted
---

# The Review editor is divided into sections, not scrolled

`ReviewModal` is where a Review is authored, and it had grown to hold
everything a Review can carry in one continuous scroll: identity, metadata,
the Critique's sections, Mods, screenshots and soundtrack. Editing a rating
meant scrolling past four textareas. Attaching a screenshot meant scrolling
past everything.

Two of its regions are conditional, and both were hidden outright when they
did not apply — Mods on a non-game, and screenshots and soundtrack on a Review
that had not been saved. So the page's length changed as a Category changed,
and a reader who did not already know those regions existed had no way to find
out.

The reference this app's chrome is drawn from does not scroll. Its menus are
fixed frames with a bar of sections across the top, an inverted marker on the
one that is open, and categories that stay in place when they are unavailable,
greyed rather than removed.

## Four sections, and one shape for the bar

The editor divides into four sections — **Data**, **Critique**, **Mods**,
**Media** — reached from a bar, with one showing at a time.

The frame is a fixed height. Contents change inside it, so the bar and the
bottom band never move under the pointer when a section is switched.

A section that a Review cannot use is **dimmed in place**, never removed. Mods
belongs to games; Media needs a saved Review to file uploads under. The bar
therefore has one shape for every Review, and a reader can see that Mods exists
before knowing it is a game thing.

Which one is showing is derived rather than stored. `tabs.ts` answers what a
Review offers, and `resolveTab` decides what is actually open: a section going
unavailable underneath the reader falls back to Data, and a section *becoming*
available does not move them, because they did not ask to go there.

## Consequences

Media stops being dead on a newly captured Review. It could not work before for
a reason unrelated to layout: uploads are filed under a Review's id, the modal
only knew the id of a Review it had been handed, and `performSave` discarded
what `add_post` returned. It now keeps that id, so the section opens as soon as
autosave writes the record — seconds in, rather than after a close and reopen.

Critique gets the whole frame, which is the section that most wants it and the
one that most has to scroll. Four textareas do not fit a fixed height, so that
section scrolls internally. If that proves too tight, the fix is a taller frame
for that section alone — which would cost the constant frame this decision
chose, and should be taken deliberately rather than drifted into.

The bar is a real `tablist`: arrows move between sections only while focus is
in it. A global arrow handler was rejected because the modal is full of inputs
where the arrows belong to the text cursor, and a bar claiming them would fight
every field in it.

## What was rejected

**Restyle the scroll.** Keep one column and add the reference's chrome —
dotted rules between groups, inverted headings, a bottom band. Cheapest, and it
leaves the two problems that prompted this: the scroll stays long, and the
conditional regions stay invisible until they apply.

**Master and detail in columns.** The reference's item menu proper: a list of
sections on the left, fields in the middle, a status panel on the right. The
closest match to the source material and the furthest from a form. Rejected on
width — three columns in a modal leaves each too narrow for a textarea, and the
layout has nowhere to go on a phone.
