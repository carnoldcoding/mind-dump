---
status: accepted
---

# Reviews live in a zustand store

`zustand` has been a dependency with no importer for long enough that `CLAUDE.md` lists "zustand is installed but unused — there is no global store in this codebase" under things that will surprise you. Every surface fetched the whole collection for itself: Search on mount, each Category page on mount, `ReviewsWindow` on open.

That was survivable while the surfaces were pages you visited one at a time. After the Now/Backlog/Search refactor there are four readers of the same list — Now, Backlog, the Search modal, and the Category pages — and one of them is a modal that can open anywhere, where a fetch-on-open means waiting before you can type.

Reviews now live in a zustand store: fetched once, read by every surface, invalidated when System writes.

## Why not a context provider

The codebase has two providers already (`BootSequenceContext`, `TrustedDeviceContext`), and matching them would have kept one idiom instead of two. That was the near-miss.

The store won because the writers are in System and the readers are public pages, and a provider that has to sit above both ends up at the top of `Layout` holding data most routes don't use — while still needing an imperative escape hatch for "System just saved, refetch". A store is that hatch without the wrapper.

## Consequences

- Two state idioms now coexist. Contexts stay for boot sequencing and device trust — things that are genuinely ambient and never written from a page. The store is for domain data.
- `CLAUDE.md`'s surprise about zustand is deleted; the honest surprise is now that both patterns are in use and which one to reach for.
- Staleness becomes possible for the first time: the Search modal reads the same cached list all session. Since there is one writer, and they are the person reading, a stale result is recognisable rather than mysterious.
