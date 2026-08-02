// Title lookup across every Category and every Status, reachable from every
// page — a prompt built into the nav bar rather than an overlay dropped on top
// of it (ADR-0003).
//
// Nothing here floats. The prompt sits on the bar's own rule and the results
// hang off it, because the interface this one imitates has no element that
// belongs to nothing.
//
// Self-contained on purpose: it owns its open state (which lives in the URL),
// its keyboard shortcut and its results, so a nav renders it and passes it
// nothing.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useReviews, type Review } from "../../store/reviews";
import { useSearch, useSearchShortcut } from "./useSearch";
import { rankByTitle } from "../../utils/rankByTitle";
import { reviewPath } from "../../utils/categories";
import gameLight from "../../assets/game-light.svg";
import monitorLight from "../../assets/monitor-light.svg";
import bookLight from "../../assets/book-light.svg";

// Display order, and the order the arrow keys walk. Addresses come from
// utils/categories — this only decides how each group is titled and iconned.
const GROUPS = [
    { type: "game", label: "GAMES", icon: gameLight },
    { type: "cinema", label: "CINEMA", icon: monitorLight },
    { type: "book", label: "BOOKS", icon: bookLight },
] as const;

// Stable per Review: focus stays in the input while the arrow keys move the
// highlight, so the active option can only be announced by id.
const optionId = (review: Review) => `search-result-${review._id}`;

// Status is a three-value lifecycle (CONTEXT.md); these are the words for it
// on this surface. Anything unrecognised shows itself rather than nothing.
const STATUS_LABEL: Record<string, string> = {
    todo: "QUEUED",
    active: "IN PROGRESS",
    done: "FINISHED",
};

export const SearchPrompt = () => {
    const { isOpen, open, close } = useSearch();
    const { reviews, loading } = useReviews();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [highlighted, setHighlighted] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useSearchShortcut(open);

    // Every Status, queued included — the old page excluded `todo`, which cost
    // the one question worth asking before capturing something: is it already
    // in here? (ADR-0003)
    const grouped = useMemo(() => {
        if (!query) return [];
        return GROUPS
            .map(group => ({
                ...group,
                results: rankByTitle(
                    reviews.filter(review => review.type === group.type),
                    query,
                ),
            }))
            .filter(group => group.results.length > 0);
    }, [reviews, query]);

    // The same list the eye walks, flattened — so "next result" means the next
    // one on screen, across group boundaries.
    const flat = useMemo(() => grouped.flatMap(group => group.results), [grouped]);

    useEffect(() => { setHighlighted(0); }, [query]);

    // Opening and typing are one motion; closing forgets what was typed, so
    // the next open is a fresh prompt rather than the last one's leftovers.
    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
        else setQuery("");
    }, [isOpen]);

    // One navigation, replacing the entry that carries `?search` rather than
    // popping it and pushing the destination. Popping first would be a race:
    // `history.go(-1)` is asynchronous in a real browser, so the push lands
    // first and the deferred pop then walks back to `?search`, reopening
    // Search on top of the Review. A memory router applies `go` synchronously,
    // which is exactly why a test cannot show the difference.
    const openResult = useCallback((review: Review) => {
        navigate(reviewPath(review), { replace: true });
    }, [navigate]);

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                close();
                return;
            }
            if (!flat.length) return;

            if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlighted(i => (i + 1) % flat.length);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlighted(i => (i - 1 + flat.length) % flat.length);
            } else if (event.key === "Enter") {
                event.preventDefault();
                const target = flat[highlighted];
                if (target) openResult(target);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, flat, highlighted, openResult, close]);

    if (!isOpen) {
        return (
            <button
                onClick={open}
                aria-label="Open search"
                aria-expanded={false}
                aria-controls="search-results"
                title="Search (Cmd/Ctrl+K)"
                className="flex items-center gap-2 px-2 py-1 cursor-pointer text-nier-text-dark/60 hover:text-nier-text-dark transition-colors"
            >
                <span aria-hidden="true" className="text-lg leading-none">&gt;</span>
                <span className="uppercase text-sm tracking-wide">Search</span>
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-1 min-w-0" role="search">
            <span aria-hidden="true" className="text-lg leading-none text-nier-text-dark">&gt;</span>
            <input
                ref={inputRef}
                type="text"
                aria-label="Search Reviews"
                role="combobox"
                aria-expanded={Boolean(query)}
                aria-controls="search-results"
                aria-autocomplete="list"
                aria-activedescendant={flat[highlighted] ? optionId(flat[highlighted]) : undefined}
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="flex-1 min-w-0 bg-transparent border-b border-nier-dark/40 focus:border-nier-dark focus:outline-none py-1 uppercase tracking-wide text-nier-text-dark"
            />
            <button
                onClick={close}
                aria-label="Close search"
                className="text-xl leading-none cursor-pointer px-1 text-nier-text-dark hover:text-nier-dark"
            >×</button>

            {/* Hangs off the bar rather than covering the page: the results
                are an extension of the chrome the prompt lives in. The
                positioning parent is the bar itself. */}
            {query && (
                <div
                    id="search-results"
                    role="listbox"
                    aria-label="Search results"
                    className="absolute left-0 right-0 top-full bg-nier-100 border-t border-nier-dark/30 shadow-[0_4px_0_0] shadow-nier-shadow max-h-[60vh] overflow-y-auto z-50"
                >
                    <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-4">
                        {grouped.map(group => (
                            <div key={group.type}>
                                <div className="flex items-center gap-2 mb-1">
                                    <img src={group.icon} className="bg-nier-dark p-0.5 w-4 h-4" alt="" />
                                    <h2 className="text-sm uppercase tracking-wide">{group.label}</h2>
                                </div>

                                <ul className="flex flex-col" role="group" aria-label={group.label}>
                                    {group.results.map(review => {
                                        const isHighlighted = flat[highlighted]?._id === review._id;
                                        return (
                                            <li key={`${review.type}-${review.slug}`} role="none">
                                                <button
                                                    id={optionId(review)}
                                                    role="option"
                                                    aria-selected={isHighlighted}
                                                    onClick={() => openResult(review)}
                                                    className={`w-full flex gap-3 items-center px-2 py-1.5 cursor-pointer text-left ${
                                                        isHighlighted ? 'bg-nier-dark' : 'hover:bg-nier-150/60'
                                                    }`}
                                                >
                                                    <div className="w-6 h-8 flex-shrink-0 bg-nier-150 overflow-hidden">
                                                        {review.image_path && (
                                                            <img
                                                                src={review.image_path}
                                                                alt=""
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <p className={`flex-1 truncate ${isHighlighted ? 'text-nier-text-light' : ''}`}>
                                                        {review.title}
                                                    </p>
                                                    <span className={`text-xs uppercase tracking-wide flex-shrink-0 ${
                                                        isHighlighted ? 'text-nier-text-light/70' : 'text-nier-text-dark/50'
                                                    }`}>
                                                        {STATUS_LABEL[review.status ?? ''] ?? review.status}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}

                        {/* "Nothing matches" is a claim about the collection,
                            so it can only be made once the collection is here.
                            Said too early it answers "have I already added
                            that?" with a confident no. */}
                        {flat.length === 0 && (
                            loading
                                ? <p className="text-nier-text-dark/50">Still loading…</p>
                                : <p className="text-nier-text-dark/50">Nothing matches that.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
