import type { Facet } from './queue';

type CategoryRailProps = {
    categories: Facet[];
    active: string | null;
    onSelect: (category: string | null) => void;
};

const LABELS: Record<string, string> = {
    game: 'GAMES',
    cinema: 'CINEMA',
    book: 'BOOKS',
};

const labelFor = (value: string | null) => (value === null ? 'ALL' : LABELS[value] ?? value.toUpperCase());

/**
 * The Category list, in the register the reference's item menu uses: a column
 * of rows down the left, each carrying its own count, with the chosen one
 * inverted.
 *
 * A Category with nothing in it is dimmed rather than removed, so the list
 * keeps its shape as filters change and nothing moves under the pointer. Same
 * rule as the editor's section bar — see docs/chrome.md on Dimmed.
 *
 * Below `sm` it lays out as a scrolling row of the same rows rather than a
 * second component: a column of four down a phone screen costs more height
 * than the list it is narrowing.
 */
export const CategoryRail = ({ categories, active, onSelect }: CategoryRailProps) => (
    <div
        role="tablist"
        aria-label="Category"
        aria-orientation="horizontal"
        className="flex sm:flex-col gap-px overflow-x-auto sm:overflow-visible flex-shrink-0 sm:w-32"
    >
        {categories.map(({ value, count }) => {
            const isActive = value === active;
            const empty = count === 0;

            return (
                <button
                    key={value ?? 'all'}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-disabled={empty}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => !empty && onSelect(value)}
                    className={[
                        'flex items-baseline justify-between gap-2 px-2 py-1 whitespace-nowrap',
                        'text-[10px] uppercase tracking-widest transition-colors duration-150',
                        isActive ? 'bg-nier-dark text-nier-text-light' : 'bg-nier-150/25 text-nier-text-dark',
                        empty ? 'opacity-35 cursor-default' : isActive ? 'cursor-default' : 'cursor-pointer hover:bg-nier-150',
                    ].join(' ')}
                >
                    <span>{labelFor(value)}</span>
                    <span className={isActive ? 'text-nier-text-light/70' : 'text-nier-text-dark/50'}>
                        {count}
                    </span>
                </button>
            );
        })}
    </div>
);
