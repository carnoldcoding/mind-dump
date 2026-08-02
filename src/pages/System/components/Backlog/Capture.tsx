// Recording a Review at the moment it occurs to you.
//
// Typing searches the provider for the chosen Category, and choosing a result
// *is* the capture — usually fewer keystrokes than typing the full title, and
// the ambiguity no automatic matcher could resolve ("Silent Hill 2", 2001 or
// 2024) is settled by the one person who knows which they meant.
//
// Capturing something the provider has never heard of stays possible: a title
// with no matches is still recorded as a title and a Category, exactly as it
// was before any of this. The lookup is the fast path, not the only path.
//
// The field is a raw input rather than the shared TextField because this is a
// combobox — it needs the roles and aria-activedescendant that let a keyboard
// walk the results, and TextField carries its own autofill dropdown that would
// fight them. The Search prompt is a raw input for the same reason, and the
// two now behave identically.

import { useEffect, useMemo, useRef, useState } from "react";
import { backend, type MetadataCandidate } from "../../../../api/backend";
import { invalidateReviews, type Review } from "../../../../store/reviews";
import { generateSlug } from "../../../../utils/slug";
import { CATEGORIES } from "../../../../utils/categories";
import { SelectField } from "../../../../components/common/SelectField";
import { Button } from "../../../../components/common/Button";

// Long enough that typing a title is one request rather than a dozen, short
// enough that pausing feels like it answers.
const DEBOUNCE_MS = 300;

const CATEGORY_OPTIONS = CATEGORIES.map(c => c.type);

type LookupState =
    | { status: 'idle' }
    | { status: 'searching' }
    | { status: 'ready'; candidates: MetadataCandidate[] }
    // A failed lookup and an empty one are different facts: reporting "nothing
    // matched" for an outage answers "is this already in there?" wrongly.
    | { status: 'failed' };

type Props = {
    /** Every Review, so anything already captured can be named before writing. */
    reviews: Review[];
};

const optionId = (candidate: MetadataCandidate, index: number) =>
    `capture-match-${candidate.sourceId ?? index}`;

export const Capture = ({ reviews }: Props) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('game');
    const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
    // -1 is "nothing chosen": Enter then records the title as typed, which is
    // the fast path for anything the provider does not know. Arrowing into the
    // list is what makes Enter choose a match instead.
    const [highlighted, setHighlighted] = useState(-1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // A ref rather than the `saving` state: two presses in the same tick share
    // one render's closure, so a state guard would still be false for both.
    const inFlight = useRef(false);
    // Only the newest query may write results; a slow earlier one landing
    // afterwards would otherwise overwrite them.
    const queryGeneration = useRef(0);

    const trimmed = title.trim();
    const candidates = lookup.status === 'ready' ? lookup.candidates : [];

    // Story 3: whether it is already in there is the question worth answering
    // before capturing — against the whole collection, not just the unfinished
    // part. It informs and never vetoes: a remake shares its original's title
    // and is worth having.
    const existing = useMemo(() => {
        const byKey = new Map<string, Review>();
        for (const review of reviews) {
            byKey.set(review.slug, review);
            byKey.set(review.title.toLowerCase(), review);
        }
        return byKey;
    }, [reviews]);

    const alreadyCaptured = (candidateTitle: string | null): Review | undefined => {
        const text = candidateTitle?.trim();
        if (!text) return undefined;
        return existing.get(generateSlug(text)) ?? existing.get(text.toLowerCase());
    };

    const typedDuplicate = alreadyCaptured(trimmed);

    useEffect(() => {
        // Bumped before anything else, including the empty-field return: a
        // capture clears the field, and without this an in-flight search from
        // the previous query would land afterwards and repopulate the list
        // under an empty prompt.
        const mine = ++queryGeneration.current;

        if (!trimmed) {
            setLookup({ status: 'idle' });
            return;
        }

        setLookup({ status: 'searching' });

        const timer = setTimeout(async () => {
            try {
                const { results } = await backend.searchMetadata(type, trimmed);
                if (mine === queryGeneration.current) {
                    setLookup({ status: 'ready', candidates: results });
                }
            } catch {
                if (mine === queryGeneration.current) setLookup({ status: 'failed' });
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [trimmed, type]);

    useEffect(() => { setHighlighted(-1); }, [trimmed, type]);

    /**
     * Writes the Review. Everything a chosen candidate knows comes with it;
     * capturing by title alone writes exactly what capture always wrote.
     */
    const write = async (candidate?: MetadataCandidate) => {
        if (inFlight.current) return;

        // The chosen candidate's title, not the typed text — so the address
        // matches the thing rather than the typo that found it.
        const finalTitle = candidate?.title?.trim() || trimmed;
        if (!finalTitle) return;

        inFlight.current = true;
        setSaving(true);
        setError(null);

        try {
            // The cover is copied first, and its failure is survivable: a
            // storage problem should not cost the capture.
            let imagePath: string | undefined;
            if (candidate?.image) {
                try {
                    imagePath = (await backend.storeCover(candidate.image)).url;
                } catch {
                    imagePath = undefined;
                }
            }

            // One Review, Status queued. Not a new kind of document, and
            // nothing gets promoted or copied later (ADR-0004).
            await backend.saveReview({
                title: finalTitle,
                slug: generateSlug(finalTitle),
                type,
                status: 'todo',
                ...(candidate ? fieldsFrom(candidate) : {}),
                ...(imagePath ? { image_path: imagePath } : {}),
            }, false);

            setTitle('');
            setLookup({ status: 'idle' });
            invalidateReviews();
        } catch {
            setError('Could not capture that — the write failed.');
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    };

    /**
     * Fetches the full record before writing, where there is one to fetch.
     * A chosen game's developers and a chosen film's director exist only in
     * the per-record response, never in a search result.
     */
    const choose = async (candidate: MetadataCandidate) => {
        if (inFlight.current) return;

        let full = candidate;
        if (candidate.sourceId) {
            try {
                const { result } = await backend.metadataDetails(type, candidate.sourceId);
                // Details wins wherever it knows something, including a cover
                // the thinner search result did not carry.
                if (result) full = { ...candidate, ...dropEmpty(result) } as MetadataCandidate;
            } catch {
                // The search result is still worth writing; it is simply
                // thinner than it could have been.
            }
        }
        await write(full);
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            setLookup({ status: 'idle' });
            setHighlighted(-1);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            const chosen = candidates[highlighted];
            if (chosen) choose(chosen);
            else write();
            return;
        }
        if (!candidates.length) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlighted(i => (i + 1) % candidates.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted(i => (i <= 0 ? candidates.length : i) - 1);
        }
    };

    const activeOption = highlighted >= 0 && candidates[highlighted]
        ? optionId(candidates[highlighted], highlighted)
        : undefined;

    return (
        <div className="relative">
            <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
            <div className="w-full bg-nier-100-lighter relative">
                <div className="h-7 w-full bg-nier-150 flex items-center px-2">
                    <h3 className="text-nier-text-dark text-sm">Capture</h3>
                </div>

                {/* Stacks on narrow screens so it stays usable one-handed on
                    the device you are holding when the thought occurs. */}
                <div className="p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="flex-1 border border-nier-150 h-12 flex items-center px-4">
                        <input
                            type="text"
                            aria-label="Title"
                            role="combobox"
                            aria-expanded={candidates.length > 0}
                            aria-controls="capture-matches"
                            aria-autocomplete="list"
                            aria-activedescendant={activeOption}
                            value={title}
                            onChange={event => setTitle(event.target.value)}
                            onKeyDown={onKeyDown}
                            className="w-full bg-transparent focus:outline-none"
                        />
                    </div>
                    <div className="sm:w-40">
                        <SelectField
                            label="Category"
                            value={type}
                            options={CATEGORY_OPTIONS}
                            onChange={setType}
                        />
                    </div>
                    <div className="sm:w-32 h-12">
                        <Button
                            label={saving ? 'Saving…' : 'Capture'}
                            type="primary"
                            handleClick={() => write()}
                        />
                    </div>
                </div>

                {typedDuplicate && (
                    <p className="px-3 pb-2 text-sm text-nier-text-dark/70">
                        Already captured: {typedDuplicate.title} ({typedDuplicate.status})
                    </p>
                )}
                {error && <p className="px-3 pb-2 text-sm text-red-700">{error}</p>}

                {lookup.status === 'searching' && (
                    <p className="px-3 pb-3 text-sm text-nier-text-dark/50">Searching…</p>
                )}

                {lookup.status === 'failed' && (
                    <p className="px-3 pb-3 text-sm text-nier-text-dark/70">
                        Lookup unavailable — Capture still records the title.
                    </p>
                )}

                {lookup.status === 'ready' && candidates.length === 0 && (
                    <p className="px-3 pb-3 text-sm text-nier-text-dark/50">
                        No matches — Capture records the title as typed.
                    </p>
                )}

                {candidates.length > 0 && (
                    <ul
                        id="capture-matches"
                        role="listbox"
                        aria-label="Matches"
                        className="flex flex-col divide-y divide-nier-150/40"
                    >
                        {candidates.map((candidate, index) => {
                            const isHighlighted = index === highlighted;
                            // Named per result, so a remake and its original
                            // stop looking alike at the moment of choosing.
                            const seen = alreadyCaptured(candidate.title);

                            return (
                                <li key={optionId(candidate, index)} role="none">
                                    <button
                                        id={optionId(candidate, index)}
                                        role="option"
                                        aria-selected={isHighlighted}
                                        onClick={() => choose(candidate)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer ${
                                            isHighlighted ? 'bg-nier-dark' : 'hover:bg-nier-150/40'
                                        }`}
                                    >
                                        <div className="w-8 h-10 flex-shrink-0 bg-nier-150 overflow-hidden">
                                            {candidate.image && (
                                                <img
                                                    src={candidate.image}
                                                    alt=""
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <span className={`flex-1 truncate text-sm uppercase tracking-wide ${
                                            isHighlighted ? 'text-nier-text-light' : ''
                                        }`}>
                                            {candidate.title}
                                        </span>
                                        {seen && (
                                            <span className={`text-xs uppercase tracking-wide flex-shrink-0 ${
                                                isHighlighted ? 'text-nier-text-light/70' : 'text-nier-text-dark/50'
                                            }`}>
                                                Captured
                                            </span>
                                        )}
                                        {/* The year is what tells a remake
                                            from its original at a glance. */}
                                        <span className={`text-xs flex-shrink-0 ${
                                            isHighlighted ? 'text-nier-text-light/70' : 'text-nier-text-dark/50'
                                        }`}>
                                            {candidate.release_date?.slice(0, 4) ?? '—'}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

/** The Review fields a candidate can fill, leaving out what it does not know. */
function fieldsFrom(candidate: MetadataCandidate): Record<string, unknown> {
    return dropEmpty({
        release_date: candidate.release_date,
        creator: candidate.creator,
        genres: candidate.genres,
        platforms: candidate.platforms,
        description: candidate.description,
    });
}

/**
 * Drops absent values, so neither a lookup nor a merge ever writes a field as
 * null, an empty string or an empty list. Absence is the only thing it decides
 * — which keys matter is the caller's business.
 */
function dropEmpty<T extends Record<string, unknown>>(source: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(source).filter(([, value]) => {
            if (value == null) return false;
            if (Array.isArray(value)) return value.length > 0;
            return String(value).trim() !== '';
        }),
    ) as Partial<T>;
}
