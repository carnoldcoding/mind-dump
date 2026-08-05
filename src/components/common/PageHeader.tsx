import { useRef } from "react";
import { useRevealSignal } from "../../hooks/useRevealSignal";
import { useRevealTimeline } from "../../hooks/useRevealTimeline";
import { decode } from "../../utils/motion";

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

    useRevealTimeline(revealed, (tl) => {
        decode(tl, '[data-page-title]', name).eventCallback('onUpdate', () => {
            const title = scope.current?.querySelector('[data-page-title]');
            const shadow = scope.current?.querySelector('[data-page-title-shadow]');
            if (title && shadow) shadow.textContent = title.textContent;
        });
    }, scope);

    return (
        <div ref={scope} className="relative">
            <h1 data-page-title className="text-5xl md:text-6xl text-nier-dark relative z-20 uppercase">{name}</h1>
            <span
                data-page-title-shadow
                aria-hidden="true"
                className="text-5xl md:text-6xl absolute left-1.5 top-1.5 text-nier-shadow/70 z-10 uppercase"
            >
                {name}
            </span>
        </div>
    );
};

export default PageHeader;
