import type { ReactNode, Ref } from 'react';

type ShadowBoxProps = {
    /** `section` for a box that names a region (give it `label`), else `div`. */
    as?: 'div' | 'section';
    label?: string;
    /** Classes for the box: its background, border and inner layout. */
    className?: string;
    /** Classes for the pair: how the box sits in its parent's layout. */
    wrapperClassName?: string;
    boxRef?: Ref<HTMLDivElement>;
    children: ReactNode;
};

/**
 * A box and the offset shadow it casts, inside a panel.
 *
 * The shadow is a **sibling** painted before the box, so the box covers it by
 * DOM order — the rule `Panel` documents for its own frame. It used to be a
 * `-z-1` child of the box. At rest that put it behind the panel's background,
 * where it could not be seen; while the Cascade faded it, it painted over the
 * box as a gray block. `data-box-shadow` tells the Cascade to fade it on the
 * box's first beat rather than a beat of its own.
 */
export const ShadowBox = ({
    as: Box = 'div',
    label,
    className = '',
    wrapperClassName = '',
    boxRef,
    children,
}: ShadowBoxProps) => (
    <div className={`relative ${wrapperClassName}`}>
        <aside data-box-shadow aria-hidden="true" className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
        <Box ref={boxRef} aria-label={label} className={`relative ${className}`}>
            {children}
        </Box>
    </div>
);
