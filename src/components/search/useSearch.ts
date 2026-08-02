// Search's open state lives in the URL, which is unlike every other mode in
// this codebase — the rest are local state behind `createPortal`. The reason
// is iOS: the back-swipe is the dismiss gesture on a phone, and a mode outside
// history turns that gesture into "leave the page entirely". See ADR-0003.
//
// That rationale is unchanged by Search being a prompt in the bar rather than
// an overlay: back should collapse the prompt, not leave the page.

import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

const PARAM = "search";

// Whether *this* session pushed the entry. Closing should pop it, leaving no
// history behind — but a URL that arrived already carrying the param has
// nothing of ours to pop, and popping it would walk the owner off the site.
let pushedByUs = false;

/** Tests only: module state outlives a single test the way a ref never did. */
export function resetSearchHistoryState() {
    pushedByUs = false;
}

/** A bare `?search`, not `?search=` — the param's presence is the whole value. */
const withSearchParam = (search: string): string => {
    const existing = search.replace(/^\?/, "");
    return existing ? `?${existing}&${PARAM}` : `?${PARAM}`;
};

const withoutSearchParam = (search: string): string => {
    const params = new URLSearchParams(search);
    params.delete(PARAM);
    const rest = params.toString();
    return rest ? `?${rest}` : "";
};

export function useSearch() {
    const location = useLocation();
    const navigate = useNavigate();

    const isOpen = new URLSearchParams(location.search).has(PARAM);

    // Module-level rather than a ref, because more than one component calls
    // this hook — the nav tab opens and the modal closes. Per-component refs
    // meant the closer never knew the opener had pushed, so it replaced
    // instead of popping and left the entry behind.

    const open = useCallback(() => {
        if (new URLSearchParams(location.search).has(PARAM)) return;
        pushedByUs = true;
        navigate({ pathname: location.pathname, search: withSearchParam(location.search) });
    }, [location.pathname, location.search, navigate]);

    const close = useCallback(() => {
        if (!new URLSearchParams(location.search).has(PARAM)) return;
        if (pushedByUs) {
            pushedByUs = false;
            navigate(-1);
            return;
        }
        navigate(
            { pathname: location.pathname, search: withoutSearchParam(location.search) },
            { replace: true },
        );
    }, [location.pathname, location.search, navigate]);

    // A back-swipe or Back press takes the param out of the URL on its own, so
    // the flag has to follow the URL rather than only the close button.
    useEffect(() => {
        if (!isOpen) pushedByUs = false;
    }, [isOpen]);

    return { isOpen, open, close };
}

/** Cmd/Ctrl+K from anywhere. Owned by the prompt, which is always mounted. */
export function useSearchShortcut(open: () => void) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() !== "k") return;
            if (!event.metaKey && !event.ctrlKey) return;
            event.preventDefault();
            open();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);
}
