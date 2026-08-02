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

import { useEffect, useRef, useState } from "react";
import { backend, type MetadataCandidate } from "../../../../api/backend";
import { invalidateReviews, type Review } from "../../../../store/reviews";
import { generateSlug } from "../../../../utils/slug";
import { CATEGORIES } from "../../../../utils/categories";
import { TextField } from "../../../../components/common/TextField";
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
    /** Every Review, so a possible duplicate can be named before writing. */
    reviews: Review[];
};

export const Capture = ({ reviews }: Props) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('game');
    const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // A ref rather than the `saving` state: two presses in the same tick share
    // one render's closure, so a state guard would still be false for both.
    const inFlight = useRef(false);
    // Only the newest query may write results; a slow earlier one landing
    // afterwards would otherwise overwrite them.
    const queryGeneration = useRef(0);

    const trimmed = title.trim();

    // Story 3: whether it is already in there is the question worth answering
    // before capturing — against the whole collection, not just the unfinished
    // part. It informs and does not veto: a remake shares its original's title
    // and is worth having.
    const duplicate = trimmed
        ? reviews.find(r =>
            r.slug === generateSlug(trimmed) ||
            r.title.toLowerCase() === trimmed.toLowerCase())
        : undefined;

    useEffect(() => {
        if (!trimmed) {
            setLookup({ status: 'idle' });
            return;
        }

        const mine = ++queryGeneration.current;
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

    /**
     * Writes the Review. Everything a chosen candidate knows comes with it;
     * capturing by title alone writes exactly what capture always wrote.
     */
    const write = async (candidate?: MetadataCandidate) => {
        if (inFlight.current) return;

        // The chosen candidate's title, not the typed text — so the address
        // matches the thing rather than the typo.
        const finalTitle = candidate?.title?.trim() || trimmed;
        if (!finalTitle) return;

        inFlight.current = true;
        setSaving(true);
        setError(null);

        try {
            // Copying the cover first, and treating its failure as survivable:
            // a storage problem should not cost the capture.
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
            setError('Network error');
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    };

    /**
     * Fetches the full record before writing, where there is one to fetch.
     * A chosen game's developers and a chosen film's director only exist in
     * the per-record response, never in a search result.
     */
    const choose = async (candidate: MetadataCandidate) => {
        let full = candidate;
        if (candidate.sourceId) {
            try {
                const { result } = await backend.metadataDetails(type, candidate.sourceId);
                if (result) full = { ...candidate, ...stripEmpty(result) };
            } catch {
                // The search result is still worth writing; it is simply
                // thinner than it could have been.
            }
        }
        await write(full);
    };

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
                    <div className="flex-1">
                        <TextField label="Title" value={title} onChange={setTitle} />
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

                {duplicate && (
                    <p className="px-3 pb-2 text-sm text-nier-text-dark/70">
                        Already captured: {duplicate.title} ({duplicate.status})
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

                {lookup.status === 'ready' && lookup.candidates.length === 0 && (
                    <p className="px-3 pb-3 text-sm text-nier-text-dark/50">
                        No matches — Capture records the title as typed.
                    </p>
                )}

                {lookup.status === 'ready' && lookup.candidates.length > 0 && (
                    <ul className="flex flex-col divide-y divide-nier-150/40" aria-label="Matches">
                        {lookup.candidates.map(candidate => (
                            <li key={candidate.sourceId ?? candidate.title}>
                                <button
                                    onClick={() => choose(candidate)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-nier-150/40 cursor-pointer"
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
                                    <span className="flex-1 truncate text-sm uppercase tracking-wide">
                                        {candidate.title}
                                    </span>
                                    {/* The year is what tells a remake from
                                        its original at a glance. */}
                                    <span className="text-xs text-nier-text-dark/50 flex-shrink-0">
                                        {candidate.release_date?.slice(0, 4) ?? '—'}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

/** The Review fields a candidate can fill, leaving out what it does not know. */
function fieldsFrom(candidate: MetadataCandidate): Record<string, unknown> {
    return stripEmpty({
        release_date: candidate.release_date,
        creator: candidate.creator,
        genres: candidate.genres,
        platforms: candidate.platforms,
        description: candidate.description,
    });
}

/** Drops absent values so a lookup never writes a field as null or empty. */
function stripEmpty<T extends Record<string, unknown>>(source: T): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(source).filter(([key, value]) => {
            if (key === 'sourceId' || key === 'image' || key === 'title') return false;
            if (value == null) return false;
            if (Array.isArray(value)) return value.length > 0;
            return String(value).trim() !== '';
        }),
    );
}
