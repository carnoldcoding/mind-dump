// Search's open state lives in the URL, which is unlike every other modal in
// this codebase — all of those are local state behind `createPortal`. The
// reason is iOS: the back-swipe is the dismiss gesture on a phone, and a modal
// outside history turns that gesture into "leave the page entirely". See
// ADR-0003.

import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

const PARAM = "search";

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

export function useSearchModal() {
    const location = useLocation();
    const navigate = useNavigate();

    const isOpen = new URLSearchParams(location.search).has(PARAM);

    // Whether *this* session pushed the entry. Closing should pop it, leaving
    // no history behind (story 21) — but a URL that arrived already carrying
    // the param has nothing of ours to pop, and popping it would walk the
    // owner off the site.
    const pushedByUs = useRef(false);

    const open = useCallback(() => {
        if (new URLSearchParams(location.search).has(PARAM)) return;
        pushedByUs.current = true;
        navigate({ pathname: location.pathname, search: withSearchParam(location.search) });
    }, [location.pathname, location.search, navigate]);

    const close = useCallback(() => {
        if (!new URLSearchParams(location.search).has(PARAM)) return;
        if (pushedByUs.current) {
            pushedByUs.current = false;
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
        if (!isOpen) pushedByUs.current = false;
    }, [isOpen]);

    return { isOpen, open, close };
}

/** Cmd/Ctrl+K from anywhere. Split out so Layout can own the one listener. */
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
