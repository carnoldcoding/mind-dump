import { useEffect, useRef, useState } from 'react';
import type { Facet, UnstartedControls, SortKey, StatusFilter } from './unstarted';

type UnstartedBarProps = {
    controls: UnstartedControls;
    categories: Facet[];
    statuses: Facet[];
    genres: Facet[];
    creators: Facet[];
    onChange: (next: Partial<UnstartedControls>) => void;
    onRandom: () => void;
    searchRef: React.Ref<HTMLInputElement>;
    /** Down and Up move the pick, so the list is drivable without leaving here. */
    onListKey: (event: React.KeyboardEvent) => void;
};

const SORTS: { key: SortKey; label: string; direction: string }[] = [
    { key: 'status', label: 'status', direction: 'started first' },
    { key: 'waiting', label: 'waiting', direction: 'longest first' },
    { key: 'title', label: 'title', direction: 'A to Z' },
    { key: 'release', label: 'release', direction: 'newest first' },
];

// The three Status values as the control shows them. 'all' hides nothing;
// 'active' is Started and 'todo' is Queued, the words the rest of System uses.
const STATUS_LABELS: Record<StatusFilter, string> = {
    all: 'all',
    active: 'started',
    todo: 'queued',
};

const field = 'bg-nier-100-lighter border border-nier-150 text-label px-2 h-7 outline-none focus:border-nier-dark';

/** A dropdown of facet options, each showing what choosing it would leave. */
const FacetSelect = ({ label, value, options, onChange }: {
    label: string;
    value: string | null;
    options: Facet[];
    onChange: (value: string | null) => void;
}) => (
    <label className="flex items-center gap-1.5">
        <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">{label}</span>
        <select
            value={value ?? ''}
            onChange={event => onChange(event.target.value || null)}
            className={`${field} cursor-pointer max-w-36 capitalize`}
        >
            <option value="" className="capitalize">all</option>
            {options.map(option => (
                <option key={option.value} value={option.value ?? ''} className="capitalize">
                    {option.value} ({option.count})
                </option>
            ))}
        </select>
    </label>
);

/**
 * Genres as a checklist, because several combine: each one ticked narrows the
 * list further, the same as the Category shelves' genre panel. Drawn as a
 * field of the strip that opens a list beneath it, since a native multiple
 * select is a scrolling box that would not sit in the row.
 */
const GenreChecklist = ({ chosen, options, onChange }: {
    chosen: string[];
    options: Facet[];
    onChange: (genres: string[]) => void;
}) => {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    // A press anywhere outside closes it, the way a native select does.
    useEffect(() => {
        if (!open) return;
        const close = (event: MouseEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const summary = chosen.length === 0 ? 'all' : chosen.length === 1 ? chosen[0] : `${chosen.length} genres`;
    const toggle = (genre: string) =>
        onChange(chosen.includes(genre) ? chosen.filter(g => g !== genre) : [...chosen, genre]);

    return (
        <div
            ref={root}
            className="relative flex items-center gap-1.5"
            onKeyDown={event => {
                if (event.key === 'Escape' && open) {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpen(false);
                }
            }}
        >
            <span aria-hidden="true" className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">Genre</span>
            <button
                type="button"
                aria-label={`Genre, ${summary}`}
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className={`${field} cursor-pointer max-w-36 truncate capitalize flex items-center gap-1.5`}
            >
                <span className="truncate">{summary}</span>
                <span aria-hidden="true" className="text-nier-text-dark/50">▾</span>
            </button>

            {open && (
                <div
                    role="group"
                    aria-label="Genres"
                    className="absolute left-0 top-full mt-1 z-20 min-w-44 max-h-64 overflow-y-auto bg-nier-100-lighter border border-nier-150 py-1"
                >
                    <button
                        type="button"
                        aria-label="Clear genres"
                        onClick={() => onChange([])}
                        disabled={chosen.length === 0}
                        className="w-full text-left text-eyebrow uppercase tracking-widest px-2 py-1 cursor-pointer hover:bg-nier-150/40 disabled:opacity-40 disabled:cursor-default"
                    >
                        clear
                    </button>
                    {options.map(option => {
                        const genre = option.value ?? '';
                        return (
                            <label
                                key={genre}
                                className="flex items-center gap-2 text-label px-2 py-1 cursor-pointer capitalize hover:bg-nier-150/40"
                            >
                                <input
                                    type="checkbox"
                                    checked={chosen.includes(genre)}
                                    onChange={() => toggle(genre)}
                                    className="accent-nier-dark cursor-pointer"
                                />
                                {genre} ({option.count})
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/**
 * Search, status, sort and the facet filters, in one strip above the list.
 *
 * This is the whole control bar now: the two-segment split is gone, so status
 * is a facet here rather than a hard section boundary (spec §3a). Category
 * moved off its own rail and into this strip as another facet.
 *
 * The search field is where the window puts focus on open, and it drives the
 * list: Down and Up move the pick through the cards and Enter opens one. That
 * is the combobox arrangement SearchModal already uses, and it is why the
 * arrows are safe to claim here.
 */
export const UnstartedBar = ({
    controls, categories, statuses, genres, creators, onChange, onRandom, searchRef, onListKey,
}: UnstartedBarProps) => {
    const sort = SORTS.find(s => s.key === controls.sort) ?? SORTS[0];
    const countFor = (value: StatusFilter) =>
        statuses.find(s => s.value === value)?.count ?? 0;

    return (
        <div className="flex flex-col gap-2">
            {/* Block 1 — search, on its own row. It drives the list: Down/Up
                move the pick through the cards, Enter opens one. */}
            <input
                ref={searchRef}
                type="search"
                value={controls.query}
                placeholder="Search"
                aria-label="Search the backlog by title"
                onChange={event => onChange({ query: event.target.value })}
                onKeyDown={onListKey}
                className={`${field} w-full`}
            />

            {/* Block 2 — the filters that narrow the one list. */}
            <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5">
                    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">Status</span>
                    <select
                        value={controls.status}
                        onChange={event => onChange({ status: event.target.value as StatusFilter })}
                        className={`${field} cursor-pointer capitalize`}
                    >
                        {(['all', 'active', 'todo'] as StatusFilter[]).map(value => (
                            <option key={value} value={value} className="capitalize">
                                {STATUS_LABELS[value]} ({countFor(value)})
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex items-center gap-1.5">
                    <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">Sort</span>
                    <select
                        value={controls.sort}
                        onChange={event => onChange({ sort: event.target.value as SortKey })}
                        className={`${field} cursor-pointer capitalize`}
                    >
                        {SORTS.map(option => (
                            <option key={option.key} value={option.key} className="capitalize">{option.label}</option>
                        ))}
                    </select>
                </label>

                <FacetSelect
                    label="Category"
                    value={controls.category}
                    options={categories.filter(c => c.value !== null)}
                    onChange={category => onChange({ category })}
                />
                <GenreChecklist
                    chosen={controls.genres}
                    options={genres}
                    onChange={genres => onChange({ genres })}
                />
                <FacetSelect
                    label="Creator"
                    value={controls.creator}
                    options={creators}
                    onChange={creator => onChange({ creator })}
                />

                {/* The direction toggle and the random pick share this row but
                    sit at its right end (ml-auto), apart from the narrowing
                    selects: both are visually distinct and act on the ordering
                    or the selection rather than on what shows. */}
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onChange({ ascending: !controls.ascending })}
                        aria-label={`Sort by ${sort.label}, ${controls.ascending ? sort.direction : 'reversed'}`}
                        title={controls.ascending ? sort.direction : 'reversed'}
                        className="text-label px-2 h-7 border border-nier-150 cursor-pointer hover:bg-nier-150/40 transition-colors duration-150"
                    >
                        {controls.ascending ? '↑' : '↓'}
                    </button>

                    <button
                        type="button"
                        onClick={onRandom}
                        title="Pick one at random from what is showing"
                        className="text-eyebrow uppercase tracking-widest px-2 h-7 border border-nier-dark cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors duration-150"
                    >
                        ? Pick
                    </button>
                </div>
            </div>
        </div>
    );
};
