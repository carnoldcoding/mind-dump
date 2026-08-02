// Sizes a panel to the space actually left below it, so it behaves like a
// window on a desktop: the frame stays put and the contents scroll inside it,
// rather than the frame growing and taking the whole page with it.
//
// Measured rather than calculated from constants. The chrome above a panel is
// a fixed nav of one height on desktop and another on mobile, plus a page
// header, plus margins — a number covering all that would be a guess that goes
// stale the first time any of them changes. Asking the element where it
// actually is cannot go stale.

import { useEffect, useRef, useState } from "react";

/** Breathing room between a panel's bottom and the footer's rule. */
const GAP_PX = 16;

/** How tall the fixed footer is, read from the variable the footer itself uses. */
function footerHeight(): number {
    const declared = getComputedStyle(document.documentElement)
        .getPropertyValue('--nier-footer-height')
        .trim();
    if (!declared) return 0;

    // The variable is a calc() of rem and px, so let the browser resolve it
    // rather than parsing it here.
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;height:${declared}`;
    document.body.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();
    return height;
}

/**
 * Returns a ref to put on the panel and the max height it should take.
 *
 * `null` until measured, so the first paint uses the panel's own height rather
 * than a wrong one — a panel that flashes at full size and snaps shorter is
 * worse than one that settles a frame late.
 */
export function usePanelHeight<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [maxHeight, setMaxHeight] = useState<number | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const measure = () => {
            // Viewport-relative, and the page is not meant to scroll once this
            // has done its job — which is the state this measures in.
            const top = element.getBoundingClientRect().top;
            const available = window.innerHeight - top - footerHeight() - GAP_PX;
            // Never so short it becomes useless; below this the page may
            // scroll, which beats a panel too small to show anything.
            setMaxHeight(Math.max(available, 320));
        };

        measure();

        window.addEventListener('resize', measure);

        // The panel's own top moves when the chrome around it changes — the
        // boot sequence revealing the nav, a filter drawer opening above it.
        // Guarded because not every environment has it, jsdom included, and a
        // resize listener alone is a working if coarser answer.
        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(measure)
            : null;
        observer?.observe(document.body);

        return () => {
            window.removeEventListener('resize', measure);
            observer?.disconnect();
        };
    }, []);

    return { ref, maxHeight };
}
