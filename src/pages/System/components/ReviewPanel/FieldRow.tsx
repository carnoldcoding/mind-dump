import type { ReactNode } from 'react';

type FieldRowProps = {
    /** Which field this row holds, so the hint bar can describe it. */
    field: string;
    onFocusField: (field: string | null) => void;
    children: ReactNode;
};

/**
 * One row of the editor, with the caret that marks where the reader is.
 *
 * The reference marks its selected row with a caret in the margin. A form has
 * no selected row, but it has a focused field, which is the same statement
 * about where attention is — so the caret follows focus.
 *
 * It is drawn with `focus-within` rather than by tracking focus in state,
 * because it is Response: the mark has no beginning or end and has to keep up
 * with a pointer that can leave half-way. The focus *reporting* is separate
 * and exists only to tell the hint bar what to describe.
 *
 * Every row reserves the caret's width whether or not it is showing, so a row
 * does not shift sideways as focus arrives.
 */
export const FieldRow = ({ field, onFocusField, children }: FieldRowProps) => (
    <div
        // How the section's entrance addresses its rows. The timeline is built
        // against a selector, so a row that does not carry this is simply not
        // in the entrance rather than visibly wrong.
        data-tab-row
        className="group/row flex items-start gap-2"
        onFocusCapture={() => onFocusField(field)}
        onBlurCapture={() => onFocusField(null)}
    >
        <span
            aria-hidden="true"
            className="w-3 shrink-0 pt-3 text-nier-text-dark opacity-0 transition-opacity duration-150 group-focus-within/row:opacity-100"
        >
            ➤
        </span>
        <div className="flex-1 min-w-0">{children}</div>
    </div>
);
