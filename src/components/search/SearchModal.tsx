// Title lookup across every Category and every Status, opened from anywhere.
// Replaces the old Search *page*: the ranking helper and the grouped-results
// shape are what survived of it (ADR-0003).

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useReviews, type Review } from "../../store/reviews";
import { rankByTitle } from "../../utils/rankByTitle";
import { reviewPath } from "../../utils/categories";
import { enterClass } from "../../utils/animations";
import gameLight from "../../assets/game-light.svg";
import monitorLight from "../../assets/monitor-light.svg";
import bookLight from "../../assets/book-light.svg";

type Props = {
    onClose: () => void;
};

// Display order, and the order the arrow keys walk. Addresses come from
// utils/categories — this only decides how each group is titled and iconned.
const GROUPS = [
    { type: "game", label: "GAMES", icon: gameLight },
    { type: "cinema", label: "CINEMA", icon: monitorLight },
    { type: "book", label: "BOOKS", icon: bookLight },
] as const;

// Status is a three-value lifecycle (CONTEXT.md); these are the words for it
// on this surface. Anything unrecognised shows itself rather than nothing.
const STATUS_LABEL: Record<string, string> = {
    todo: "QUEUED",
    active: "IN PROGRESS",
    done: "FINISHED",
};

export const SearchModal = ({ onClose }: Props) => {
    const { reviews, loading } = useReviews();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [highlighted, setHighlighted] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Opening and typing should be one motion (story 12).
    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
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
    }, [flat, highlighted, navigate, onClose]);

    // One navigation, replacing the entry that carries `?search` rather than
    // popping it and pushing the destination. Popping first would be a race:
    // `history.go(-1)` is asynchronous in a real browser, so the push lands
    // first and the deferred pop then walks back to `?search`, reopening
    // Search on top of the Review. A memory router applies `go` synchronously,
    // which is exactly why a test cannot show the difference.
    //
    // Replacing also leaves the history right: back from the Review goes to
    // wherever Search was opened from, not through the search itself.
    const openResult = (review: Review) => {
        navigate(reviewPath(review), { replace: true });
    };

    return createPortal(
        <div
            className="fixed inset-0 z-200 flex items-start justify-center p-4 pt-20 bg-nier-dark/40"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Search"
                className={`relative w-full max-w-2xl ${enterClass('nier-modal-enter')}`}
                onClick={event => event.stopPropagation()}
            >
                <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
                <div className="relative bg-nier-100 border border-nier-150">
                    <div className="h-10 bg-nier-150 flex items-center justify-between px-4">
                        <h3 className="text-nier-text-dark text-lg uppercase tracking-wider">Search</h3>
                        <button
                            onClick={onClose}
                            aria-label="Close search"
                            className="text-2xl leading-none cursor-pointer hover:text-nier-text-light"
                        >×</button>
                    </div>

                    <div className="p-4 flex flex-col gap-5">
                        <div className="border-2 border-nier-150 flex">
                            <input
                                ref={inputRef}
                                type="text"
                                aria-label="Search Reviews"
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                className="focus:outline focus:border-nier-dark w-full p-2 px-4"
                            />
                        </div>

                        <div className="flex flex-col gap-10 overflow-y-auto max-h-100">
                            {grouped.map(group => (
                                <div key={group.type}>
                                    <div className="flex items-center justify-start gap-2">
                                        <img src={group.icon} className="bg-nier-dark p-1" alt="" />
                                        <h2 className="text-2xl">{group.label}</h2>
                                    </div>

                                    <ul className="ml-10 mt-3 flex flex-col gap-2" aria-label={group.label}>
                                        {group.results.map(review => {
                                            const isHighlighted = flat[highlighted]?.slug === review.slug;
                                            return (
                                                <li key={review.slug}>
                                                    <button
                                                        onClick={() => openResult(review)}
                                                        aria-current={isHighlighted ? "true" : undefined}
                                                        className={`w-full flex gap-2 cursor-pointer items-center p-2 group text-left ${
                                                            isHighlighted ? 'bg-nier-dark' : 'bg-nier-150/60 hover:bg-nier-dark'
                                                        }`}
                                                    >
                                                        <div className={`h-4 w-4 flex-shrink-0 ${isHighlighted ? 'bg-nier-text-light' : 'bg-nier-dark group-hover:bg-nier-text-light'}`} />
                                                        <p className={`text-lg leading-none flex-1 ${isHighlighted ? 'text-nier-text-light' : 'group-hover:text-nier-text-light'}`}>
                                                            {review.title}
                                                        </p>
                                                        {/* Story 15: a finished write-up and something
                                                            only queued should not look alike. */}
                                                        <span className={`text-xs uppercase tracking-wide flex-shrink-0 ${isHighlighted ? 'text-nier-text-light/70' : 'text-nier-text-dark/50 group-hover:text-nier-text-light/70'}`}>
                                                            {STATUS_LABEL[review.status ?? ''] ?? review.status}
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}

                            {/* "Nothing matches" is a claim about the
                                collection, so it can only be made once the
                                collection is here. Said too early it answers
                                "have I already added that?" with a confident
                                no (story 16). */}
                            {query && flat.length === 0 && (
                                loading
                                    ? <p className="text-nier-text-dark/50">Still loading…</p>
                                    : <p className="text-nier-text-dark/50">Nothing matches that.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};
