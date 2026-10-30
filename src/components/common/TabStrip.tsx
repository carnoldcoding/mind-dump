type TabStripProps<T extends string> = {
    tabs: { id: T; label: string }[];
    active: T;
    onChange: (id: T) => void;
    className?: string;
};

/**
 * A row of tabs with its own edge: a bottom border, and the selected tab
 * inverted per docs/chrome.md. It is chrome — it stays on screen while the
 * content it switches fades in under it (docs/motion.md). Mind's view strip
 * is the model.
 */
export const TabStrip = <T extends string>({ tabs, active, onChange, className = "" }: TabStripProps<T>) => (
    <div className={`flex items-stretch flex-shrink-0 overflow-x-auto border-b border-nier-150 ${className}`}>
        {tabs.map(t => (
            <button
                key={t.id}
                onClick={() => onChange(t.id)}
                aria-pressed={active === t.id}
                className={`px-4 py-2 text-label uppercase tracking-widest cursor-pointer transition-colors ${
                    active === t.id
                        ? "bg-nier-dark text-nier-text-light"
                        : "text-nier-text-dark/70 hover:bg-nier-150/50"
                }`}
            >
                {t.label}
            </button>
        ))}
    </div>
);
