import { useRef } from "react";
import { useRevealSignal } from "../../hooks/useRevealSignal";
import { useRevealTimeline } from "../../hooks/useRevealTimeline";
import { decode, fade } from "../../utils/motion";

/**
 * The page's own title, drawn twice: the text, and the offset shadow it casts.
 *
 * Only the text is decoded. Scrambling both would give each its own random
 * glyphs — two tweens drawing from two random streams — and the shadow would
 * spell something different from the thing casting it. The shadow copies the
 * text on every tick instead, so they cannot disagree by construction. Same
 * reasoning as a panel's frame and shadow sharing one Wipe.
 */
const PageHeader = ({ name }: { name: string }) => {
    const revealed = useRevealSignal();
    const scope = useRef<HTMLDivElement>(null);

    // Keyed on `name`: the shared Category shelf swaps its title (GAMES→CINEMA)
    // without remounting this component, and a title whose text has changed is a
    // different entrance, not the same one — so it re-Decodes on the change. A
    // page whose title is constant never rebuilds, so this costs nothing there.
    useRevealTimeline(revealed, (tl) => {
        // Decode is a `.to()` and does not hide on build, so the title and its
        // shadow would sit visible before the beat — a pop. A Fade at the same
        // beat hides them on build and brings them in as the text scrambles.
        fade(tl, '[data-page-title], [data-page-title-shadow]');
        decode(tl, '[data-page-title]', name, '<').eventCallback('onUpdate', () => {
            const title = scope.current?.querySelector('[data-page-title]');
            const shadow = scope.current?.querySelector('[data-page-title-shadow]');
            if (title && shadow) shadow.textContent = title.textContent;
        });
    }, scope, [name]);

    return (
        <div ref={scope} className="relative mb-2 lg:mb-0">
            <h1 data-page-title className="text-display text-nier-dark relative z-20 uppercase">{name}</h1>
            <span
                data-page-title-shadow
                aria-hidden="true"
                className="text-display absolute left-1.5 top-1.5 text-nier-shadow/70 z-10 uppercase"
            >
                {name}
            </span>
        </div>
    );
};

export default PageHeader;
