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
import { domino, wipe, decode } from "../../utils/motion";

vi.mock("../../api/backend", () => ({
    backend: { getReviews: vi.fn() },
}));

// Spy on the primitives while keeping their real behaviour, so the shelf still
// renders and animates. What each *gesture* does frame-by-frame is gsap's job
// and the operator's eye; what this asserts is which gesture is (re)built when
// the Category changes — the wiring the spec turns on. Observing the transient
// hidden frame directly is unreliable here: gsap's play() re-wakes the ticker
// and auto-completes a reveal between awaits, so a mid-flight opacity is gone
// by the time a test can read it.
vi.mock("../../utils/motion", async (importActual) => {
    const actual = await importActual<typeof import("../../utils/motion")>();
    return {
        ...actual,
        domino: vi.fn(actual.domino),
        wipe: vi.fn(actual.wipe),
        decode: vi.fn(actual.decode),
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
        makeReview("Nioh", { type: "game" }),
        makeReview("Dune", { type: "book" }),
    ] as never);
});

afterEach(() => {
    cleanup();
    resetMotionOverride();
});

/**
 * With motion *on*. The shared Category shelf keeps one component instance
 * across Games/Cinema/Books, so a toggle used to swap the data with no motion —
 * a comment even claimed it re-animated, but the reveal hooks keyed their
 * rebuild on nothing that changed on a toggle. These hold the shelf to
 * re-animating its contents on a toggle while leaving its frame in place.
 */
describe("the shelf re-animating on a Category toggle", () => {
    it("shows the other Category's Review after the toggle", async () => {
        await showGames();
        expect(shelfCardCount()).toBeGreaterThan(0);

        await goToBooks();

        expect(screen.getByText("Dune")).toBeDefined();
        expect(screen.queryByText("Nioh")).toBeNull();
    });

    it("replays the card Domino when the Category changes", async () => {
        await showGames();
        const dominoesBefore = vi.mocked(domino).mock.calls.length;

        await goToBooks();

        // The domino is rebuilt against the new Category's cards — the replay
        // the old code lacked, because its rebuildOn did not include the
        // Category.
        expect(vi.mocked(domino).mock.calls.length).toBeGreaterThan(dominoesBefore);
    });

    it("re-Decodes the panel title when the Category changes", async () => {
        await showGames();
        const decodesBefore = vi.mocked(decode).mock.calls.length;

        await goToBooks();

        expect(vi.mocked(decode).mock.calls.length).toBeGreaterThan(decodesBefore);
    });

    it("does not re-Wipe the frame when the Category changes", async () => {
        await showGames();
        const wipesBefore = vi.mocked(wipe).mock.calls.length;

        await goToBooks();

        // The frame is stable chrome: keyed on nothing that changes on a toggle,
        // so its wipe is not rebuilt and it stays in place.
        expect(vi.mocked(wipe).mock.calls.length).toBe(wipesBefore);
    });
});
