import type { Tab, TabId } from './tabs';

type TabBarProps = {
    tabs: Tab[];
    active: TabId;
    onSelect: (id: TabId) => void;
    /** Reported so the hint bar can describe what the pointer is over. */
    onHover: (id: TabId | undefined) => void;
};

/**
 * The editor's section bar, in the register the reference's menus use.
 *
 * Three things carry the state, and none of them is a timeline: the active tab
 * inverts, an unavailable one dims, and both are *selection* — docs/motion.md
 * gives hover, focus, selection and press to Response, which is CSS
 * transitions, because they are driven by state rather than by a position and
 * have to survive being interrupted half-way.
 *
 * Arrow keys move between tabs only while focus is in the bar, which is the
 * standard tablist pattern and the reason this does not need a global key
 * handler: the modal is full of inputs where ← and → belong to the text
 * cursor, and a bar that claimed them would fight every field in it.
 */
export const TabBar = ({ tabs, active, onSelect, onHover }: TabBarProps) => {
    const selectable = tabs.filter(tab => tab.available);

    const step = (delta: number) => {
        const at = selectable.findIndex(tab => tab.id === active);
        // Wraps, so the bar has no dead ends — the reference's does the same.
        const next = selectable[(at + delta + selectable.length) % selectable.length];
        if (next) onSelect(next.id);
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
        else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
        else if (event.key === 'Home') { event.preventDefault(); onSelect(selectable[0].id); }
        else if (event.key === 'End') { event.preventDefault(); onSelect(selectable[selectable.length - 1].id); }
    };

    return (
        <div
            role="tablist"
            aria-label="Review sections"
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
            onMouseLeave={() => onHover(undefined)}
            className="nier-dot-pattern flex items-stretch gap-1 px-4 pt-2 shrink-0"
        >
            {tabs.map(tab => {
                const isActive = tab.id === active;

                return (
                    <button
                        key={tab.id}
                        role="tab"
                        type="button"
                        id={`review-tab-${tab.id}`}
                        aria-controls={`review-panel-${tab.id}`}
                        aria-selected={isActive}
                        aria-disabled={!tab.available}
                        // Roving: only the active tab is in the tab order, so
                        // Tab from the bar goes into the panel rather than
                        // walking along four buttons first.
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => tab.available && onSelect(tab.id)}
                        onMouseEnter={() => onHover(tab.id)}
                        onFocus={() => onHover(tab.id)}
                        onBlur={() => onHover(undefined)}
                        className={[
                            'px-3 py-1 text-xs uppercase tracking-widest transition-colors duration-150',
                            isActive
                                ? 'bg-nier-dark text-nier-text-light'
                                : 'text-nier-text-dark',
                            tab.available
                                ? isActive ? 'cursor-default' : 'cursor-pointer hover:bg-nier-150'
                                // Present but inert. It keeps its slot so the
                                // bar does not reflow when a Category changes
                                // or the first save lands.
                                : 'opacity-35 cursor-default',
                        ].join(' ')}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};
