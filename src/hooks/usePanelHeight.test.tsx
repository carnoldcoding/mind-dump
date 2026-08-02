import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { usePanelHeight } from "./usePanelHeight";

// jsdom reports every element at 0×0, so the panel's top is stubbed per test.
// That is the one input this hook has, and stubbing it is what lets the
// arithmetic be asserted at all.
const Panel = () => {
    const { ref, maxHeight } = usePanelHeight<HTMLDivElement>();
    return (
        <div ref={ref} data-testid="panel" data-max={maxHeight ?? 'unmeasured'} />
    );
};

const atTop = (top: number) => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        top, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0,
        toJSON: () => ({}),
    } as DOMRect);
};

const measured = () => screen.getByTestId('panel').getAttribute('data-max');

beforeEach(() => {
    window.innerHeight = 900;
    // custom.css is not loaded by the test run, so both variables resolve to
    // nothing and the hook falls back: no footer to subtract, and its own
    // fallback floor. The sums below are therefore chrome-free on purpose.
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("sizing a panel to what is left below it", () => {
    it("takes the room between its own top and the bottom of the viewport", () => {
        atTop(200);
        render(<Panel />);

        // 900 viewport − 200 top − 16 gap
        expect(measured()).toBe('684');
    });

    it("gives a panel further down the page less room", () => {
        atTop(400);
        render(<Panel />);

        expect(measured()).toBe('484');
    });

    // A panel squeezed to nothing is worse than a page that scrolls. The same
    // floor the frames use for their width, so both axes bottom out together.
    it("refuses to shrink below a usable height", () => {
        atTop(800);
        render(<Panel />);

        expect(measured()).toBe('320');
    });

    it("re-measures when the window resizes", () => {
        atTop(200);
        render(<Panel />);
        expect(measured()).toBe('684');

        act(() => {
            window.innerHeight = 600;
            window.dispatchEvent(new Event('resize'));
        });

        expect(measured()).toBe('384');
    });

    // Not every environment has ResizeObserver, jsdom included. The hook has
    // to work without it rather than throw on mount.
    it("works where ResizeObserver does not exist", () => {
        atTop(200);
        expect(() => render(<Panel />)).not.toThrow();
        expect(measured()).toBe('684');
    });
});
