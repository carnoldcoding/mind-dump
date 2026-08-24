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
import { domino, wipe, decode, ripple, decodeGroup } from "../../utils/motion";

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
        ripple: vi.fn(actual.ripple),
        decodeGroup: vi.fn(actual.decodeGroup),
    };
});

// Ripple is called once per section wave, with that section's selector as its
// target — so a substring picks out one section's calls from the rest.
const rippleCallsMatching = (needle: string) =>
    vi.mocked(ripple).mock.calls.filter(
        (call) => typeof call[1] === "string" && (call[1] as string).includes(needle),
    ).length;

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
    // Distinct genres per Category so the visible genre set actually changes on
    // a toggle — which is what the genre Ripple keys its replay on.
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

/**
 * The finer arrival grammar (ADR-0011): the section headers land as one Decode
 * group, the bodies fill in their own idioms, and a Category toggle replays only
 * the sections whose contents changed — leaving the category-invariant scaffold
 * (headers, Rating cells) in place, the same way the frame stays.
 */
describe("the section-scoped arrival", () => {
    it("decodes the section headers as a group on arrival", async () => {
        await showGames();
        // decodeGroup is the header group beat — called at least for the
        // always-present headers (Genre, Rating, Search, Shelf).
        expect(vi.mocked(decodeGroup).mock.calls.length).toBeGreaterThan(0);
    });

    it("ripples the genre rows in place rather than Dominoing them", async () => {
        await showGames();
        // Genre rows now fade in one after another (Ripple), not slide (Domino).
        expect(rippleCallsMatching('[data-section="genre"]')).toBeGreaterThan(0);
    });

    it("replays the genre Ripple when the Category changes", async () => {
        await showGames();
        const before = rippleCallsMatching('[data-section="genre"]');

        await goToBooks();

        // Genre rows differ by Category, so their wave rebuilds over the new set.
        expect(rippleCallsMatching('[data-section="genre"]')).toBeGreaterThan(before);
    });

    it("does not replay the Rating-cell Ripple when the Category changes", async () => {
        await showGames();
        const before = rippleCallsMatching('[data-section="rating"]');

        await goToBooks();

        // The Rating scale is identical every Category, so its cells are stable
        // chrome on the arrival-only timeline: they must not re-ripple on a
        // toggle, the same guarantee the frame's wipe has.
        expect(rippleCallsMatching('[data-section="rating"]')).toBe(before);
    });
});
