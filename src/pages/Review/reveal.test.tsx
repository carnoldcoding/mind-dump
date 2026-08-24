import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import gsap from "gsap";
import Review from "./index";
import { backend } from "../../api/backend";
import { BootSequenceProvider } from "../../context/BootSequenceContext";
import { resetMotionOverride, setMotionOverride } from "../../utils/animations";
import { resetReviewsStore } from "../../store/reviews";
import { makeReview } from "../../test/reviews";
import { cascade, wipe } from "../../utils/motion";

vi.mock("../../api/backend", () => ({
    backend: { getReviews: vi.fn() },
}));

// Spy on the two functions the shelf's reveal actually calls — the frame Wipe
// and the content Cascade — while keeping their real behaviour, so the shelf
// still renders and animates. What each gesture does frame-by-frame is gsap's
// job and the operator's eye; what this asserts is the wiring: that the whole
// content re-cascades on a Category change while the frame is left in place.
//
// Only the module's exported bindings can be spied, and Cascade calls the other
// primitives by their module-local names — so those internal calls are not
// observable here. That is fine: coverage of what Cascade reveals lives in
// motion.test.ts; this file asserts the reveal is wired and re-keyed correctly.
vi.mock("../../utils/motion", async (importActual) => {
    const actual = await importActual<typeof import("../../utils/motion")>();
    return {
        ...actual,
        cascade: vi.fn(actual.cascade),
        wipe: vi.fn(actual.wipe),
    };
});

const mocked = vi.mocked(backend);

const advance = async (seconds: number) => {
    await act(async () => {
        gsap.globalTimeline.time(gsap.globalTimeline.time() + seconds);
    });
};

const flush = async () => {
    await act(async () => { await Promise.resolve(); });
};

// Stays mounted across the nav, so the shelf re-renders with a new Category
// rather than remounting — the thing under test.
const Harness = () => {
    const navigate = useNavigate();
    return (
        <>
            <button onClick={() => navigate("/books")}>go-books</button>
            <Routes>
                <Route path="/:category" element={<Review />} />
            </Routes>
        </>
    );
};

const shelfCardCount = () => document.querySelectorAll('[data-shelf-card]').length;

const showGames = async () => {
    render(
        <BootSequenceProvider>
            <MemoryRouter initialEntries={["/games"]}>
                <Harness />
            </MemoryRouter>
        </BootSequenceProvider>,
    );
    await flush();
    await advance(10);
    await advance(5);
    await screen.findByText("Nioh");
};

const goToBooks = async () => {
    await act(async () => { fireEvent.click(screen.getByText("go-books")); });
    await flush();
    await advance(5);
    await screen.findByText("Dune");
};

beforeEach(() => {
    setMotionOverride("on");
    vi.clearAllMocks();
    resetReviewsStore();
    mocked.getReviews.mockResolvedValue([
        makeReview("Nioh", { type: "game", genres: ["action"] }),
        makeReview("Dune", { type: "book", genres: ["biography"] }),
    ] as never);
});

afterEach(() => {
    cleanup();
    resetMotionOverride();
});

/**
 * With motion *on*. The shared Category shelf keeps one component instance
 * across Games/Cinema/Books, so a toggle used to swap the data with no motion.
 * Under the total-coverage Cascade (ADR-0012) the whole content re-animates on a
 * toggle, while the frame stays put as stable chrome (ADR-0010).
 */
describe("the shelf's content Cascade on a Category toggle", () => {
    it("shows the other Category's Review after the toggle", async () => {
        await showGames();
        expect(shelfCardCount()).toBeGreaterThan(0);

        await goToBooks();

        expect(screen.getByText("Dune")).toBeDefined();
        expect(screen.queryByText("Nioh")).toBeNull();
    });

    it("runs the content Cascade on arrival", async () => {
        await showGames();

        // The whole panel content is revealed in one Cascade over the frame.
        expect(vi.mocked(cascade).mock.calls.length).toBeGreaterThan(0);
    });

    it("re-cascades the content when the Category changes", async () => {
        await showGames();
        const before = vi.mocked(cascade).mock.calls.length;

        await goToBooks();

        // Keyed on [loading, category, visibleGenres], so a toggle rebuilds the
        // Cascade and re-runs the whole sequence over the new Category's content —
        // nothing is swapped in without an entrance.
        expect(vi.mocked(cascade).mock.calls.length).toBeGreaterThan(before);
    });

    it("does not re-Wipe the frame when the Category changes", async () => {
        await showGames();
        const wipesBefore = vi.mocked(wipe).mock.calls.length;

        await goToBooks();

        // The frame is stable chrome: keyed on nothing that changes on a toggle,
        // so its Wipe is not rebuilt and it stays in place while the content
        // re-cascades inside it.
        expect(vi.mocked(wipe).mock.calls.length).toBe(wipesBefore);
    });

    it("cascades over the frame element, not the whole wrapper", async () => {
        await showGames();

        // The Cascade roots at the frame article so the shadow and frame surfaces
        // (whose Wipe is separate) are outside its walk.
        const root = vi.mocked(cascade).mock.calls.at(-1)?.[1] as HTMLElement | undefined;
        expect(root?.getAttribute("data-testid")).toBe("panel-frame");
    });
});
