import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ShadowBox } from "../../../../components/common/ShadowBox";
import { GLYPH } from "./glyphs";
import { GlyphButton } from "./marks";
import { EYEBROW, rowClass } from "./frameStyle";
import { stepped } from "./session";
import { finePointer } from "./today";

// The one structure the three Body views are drawn in (docs/chrome.md, "List
// and pane"): a header band, a list that only selects, a pane that holds the
// fields of the selected row, and a hint bar that says what that row does.

/**
 * The frame. It fills the height it is given: the list scrolls inside it, and
 * the pane and the hint bar stay in place. `id` names its parts for a test
 * (`<id>-list`, `<id>-pane`, `<id>-hint`). `selected` is the id of the selected
 * row; when it changes, that row is scrolled into sight.
 */
export const Frame = ({ id, label, title, aside, toolbar, list, pane, paneKey, hint, error, selected, wide = false }: {
    id: string;
    label: string;
    title: string;
    aside?: string;
    /** View controls, under the header band. */
    toolbar?: ReactNode;
    list: ReactNode;
    pane: ReactNode;
    /** Remounts the pane, so its fields start fresh for another row. */
    paneKey: string;
    hint: string;
    /** Shown in the hint bar, in place of the hint. */
    error?: string;
    selected: string | null;
    /** The pane is what the view is for (analytics, an editor): on a phone it gets the larger part. */
    wide?: boolean;
}) => {
    const listRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
    }, [selected]);

    return (
        <ShadowBox
            as="section"
            label={label}
            wrapperClassName="flex-1 min-h-0 flex flex-col"
            className="flex-1 min-h-0 flex flex-col bg-nier-100-lighter border border-nier-150"
        >
            <header data-testid={`${id}-heading`} className="min-h-10 shrink-0 bg-nier-150 flex items-center justify-between gap-3 px-3 py-1 uppercase tracking-widest text-nier-text-dark">
                <h2 data-testid={`${id}-title`} className="text-title tracking-wide">{title}</h2>
                {aside && <span data-testid={`${id}-aside`} className="text-body">{aside}</span>}
            </header>
            {toolbar}

            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
                <div
                    ref={listRef}
                    data-testid={`${id}-list`}
                    className={`min-h-0 overflow-y-auto md:flex-none md:w-96 md:max-h-none md:border-r md:border-nier-150 ${wide ? "shrink-0 max-h-[35%]" : "flex-1"}`}
                >
                    {list}
                </div>
                <div
                    key={paneKey}
                    data-testid={`${id}-pane`}
                    className={`min-h-0 overflow-y-auto border-t border-nier-150 md:border-t-0 md:flex-1 md:max-h-none p-3 md:p-6 flex flex-col gap-3 ${wide ? "flex-1" : "shrink-0 max-h-[60%]"}`}
                >
                    {pane}
                </div>
            </div>

            <footer
                data-testid={`${id}-hint`}
                role={error ? "alert" : undefined}
                className={`min-h-10 shrink-0 flex items-center px-3 py-2 border-t border-nier-150 bg-nier-100 text-label ${error ? "text-red-800" : "text-nier-text-dark/70"}`}
            >
                {error || hint}
            </footer>
        </ShadowBox>
    );
};

/**
 * A row of a list: a state glyph, a name, a value. The selected row is
 * inverted and carries the caret in place of its glyph. Its fields are in the
 * pane, not under it.
 */
export const ListRow = ({ id, name, label, glyph, value, valueLabel, mid, paired = false, selected, onSelect, testId }: {
    id: string;
    name: string;
    /** The name for a screen reader, when the row shows a glyph for a name. */
    label?: string;
    glyph: string;
    value?: string;
    /** The value in words, when the value is glyphs. */
    valueLabel?: string;
    /** A mark between the name and the value. */
    mid?: ReactNode;
    paired?: boolean;
    selected: boolean;
    onSelect: (id: string) => void;
    testId?: string;
}) => (
    <button
        type="button"
        data-testid={testId ?? `row-${id}`}
        data-selected={selected}
        aria-current={selected ? "true" : undefined}
        aria-label={label}
        title={label}
        onClick={() => onSelect(id)}
        className={rowClass(selected, paired)}
    >
        <span aria-hidden data-testid="mark" className="w-6 shrink-0 text-center text-body leading-none">{selected ? GLYPH.next : glyph}</span>
        <span className="flex-1 min-w-0 text-body truncate">{name}</span>
        {mid}
        {value !== undefined && (
            <span data-testid="state" aria-label={valueLabel} className="min-w-14 shrink-0 text-right text-label tracking-widest tabular-nums">{value}</span>
        )}
    </button>
);

/** The first line of a pane: what is selected, and a short fact about it. */
export const PaneTitle = ({ name, at }: { name: string; at?: string }) => (
    <div className="flex items-baseline justify-between gap-3">
        <h3 data-testid="pane-title" className="text-heading uppercase tracking-widest text-nier-text-dark truncate">{name}</h3>
        {at && <span data-testid="pane-at" className={`${EYEBROW} shrink-0`}>{at}</span>}
    </div>
);

/**
 * The one large number of a pane. It is a field, so it can be typed into, but
 * it takes the keyboard on its own only where there is a mouse: on a phone
 * the keyboard stays shut until the number is pressed (body-flow R19).
 */
export const BigNumber = ({ label, value, onChange, decimal = false, placeholder, wide = false, focus = true }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    decimal?: boolean;
    placeholder?: string;
    wide?: boolean;
    focus?: boolean;
}) => (
    <input
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        aria-label={label}
        autoFocus={focus && finePointer()}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${wide ? "w-40" : "w-16 md:w-24"} h-12 min-w-0 bg-transparent text-center text-display tabular-nums text-nier-text-dark placeholder:text-nier-text-dark/25 border-b border-nier-dark focus:outline-none focus:border-b-2`}
    />
);

/**
 * A number with − and + beside it: for a value that most often changes by a
 * little (body-flow D2). `less` and `more` name the two controls.
 */
export const Stepper = ({ label, value, onChange, size = 1, less, more, focus = true }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    size?: number;
    less: string;
    more: string;
    focus?: boolean;
}) => (
    <>
        <GlyphButton glyph={GLYPH.less} label={less} onClick={() => onChange(stepped(value, -size))} />
        <BigNumber label={label} value={value} onChange={onChange} focus={focus} />
        <GlyphButton glyph={GLYPH.more} label={more} onClick={() => onChange(stepped(value, size))} />
    </>
);

/** A labelled number, one cell of a grid of them. */
export const Stat = ({ label, value, sub, testId }: { label: string; value: string; sub?: string; testId?: string }) => (
    <div className="px-3 py-2 flex flex-col gap-1 min-w-0 border-r border-b border-nier-150/50">
        <span className={EYEBROW}>{label}</span>
        <span data-testid={testId} className="text-heading text-nier-text-dark tabular-nums break-words">{value}</span>
        {sub && <span className="text-eyebrow text-nier-text-dark/50 tabular-nums truncate">{sub}</span>}
    </div>
);

/** The grid the Stats sit in: a hairline around each cell. A last row that is not full stays plain. */
export const Stats = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 border-l border-t border-nier-150/50">{children}</div>
);
