import type { Facet, UnstartedControls, SortKey } from './unstarted';

type UnstartedBarProps = {
    controls: UnstartedControls;
    genres: Facet[];
    creators: Facet[];
    onChange: (next: Partial<UnstartedControls>) => void;
    onRandom: () => void;
    searchRef: React.Ref<HTMLInputElement>;
    /** Down and Up move the pick, so the list is drivable without leaving here. */
    onListKey: (event: React.KeyboardEvent) => void;
};

const SORTS: { key: SortKey; label: string; direction: string }[] = [
    { key: 'waiting', label: 'waiting', direction: 'longest first' },
    { key: 'title', label: 'title', direction: 'A to Z' },
    { key: 'release', label: 'release', direction: 'newest first' },
];

const field = 'bg-nier-100-lighter border border-nier-150 text-xs px-2 h-7 outline-none focus:border-nier-dark';

/** A dropdown of facet options, each showing what choosing it would leave. */
const FacetSelect = ({ label, value, options, onChange }: {
    label: string;
    value: string | null;
    options: Facet[];
    onChange: (value: string | null) => void;
}) => (
    <label className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">{label}</span>
        <select
            value={value ?? ''}
            onChange={event => onChange(event.target.value || null)}
            className={`${field} cursor-pointer max-w-36`}
        >
            <option value="">all</option>
            {options.map(option => (
                <option key={option.value} value={option.value ?? ''}>
                    {option.value} ({option.count})
                </option>
            ))}
        </select>
    </label>
);

/**
 * Search, sort and the facet filters, in one row above the list.
 *
 * The search field is where the window puts focus on open, and it drives the
 * list: Down and Up move the pick through the rows and Enter opens one. That
 * is the combobox arrangement SearchModal already uses, and it is why the
 * arrows are safe to claim here — moving through results is what they mean
 * while typing into a field that filters them.
 */
export const UnstartedBar = ({
    controls, genres, creators, onChange, onRandom, searchRef, onListKey,
}: UnstartedBarProps) => {
    const sort = SORTS.find(s => s.key === controls.sort) ?? SORTS[0];

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
                <input
                    ref={searchRef}
                    type="search"
                    value={controls.query}
                    placeholder="Search titles"
                    aria-label="Search Not Started by title"
                    onChange={event => onChange({ query: event.target.value })}
                    onKeyDown={onListKey}
                    className={`${field} flex-1 min-w-40`}
                />

                <label className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">Sort</span>
                    <select
                        value={controls.sort}
                        onChange={event => onChange({ sort: event.target.value as SortKey })}
                        className={`${field} cursor-pointer`}
                    >
                        {SORTS.map(option => (
                            <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                    </select>
                </label>

                <button
                    type="button"
                    onClick={() => onChange({ ascending: !controls.ascending })}
                    aria-label={`Sort by ${sort.label}, ${controls.ascending ? sort.direction : 'reversed'}`}
                    title={controls.ascending ? sort.direction : 'reversed'}
                    className="text-xs px-2 h-7 border border-nier-150 cursor-pointer hover:bg-nier-150/40 transition-colors duration-150"
                >
                    {controls.ascending ? '↑' : '↓'}
                </button>

                {/* The control a list of hundreds actually needs. It picks
                    from whatever is showing and only picks — nothing is
                    started or changed by it. */}
                <button
                    type="button"
                    onClick={onRandom}
                    title="Pick one at random from what is showing"
                    className="text-[10px] uppercase tracking-widest px-2 h-7 border border-nier-dark cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors duration-150"
                >
                    ? Pick
                </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <FacetSelect
                    label="Genre"
                    value={controls.genre}
                    options={genres}
                    onChange={genre => onChange({ genre })}
                />
                <FacetSelect
                    label="Creator"
                    value={controls.creator}
                    options={creators}
                    onChange={creator => onChange({ creator })}
                />
            </div>
        </div>
    );
};
