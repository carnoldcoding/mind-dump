import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import gsap from "gsap";
import ReviewDetail from "./index";
import { backend } from "../../api/backend";
import { BootSequenceProvider } from "../../context/BootSequenceContext";
import { resetMotionOverride, setMotionOverride } from "../../utils/animations";

vi.mock("../../api/backend", () => ({
    backend: {
        getReviews: vi.fn(),
        getAudioTracks: vi.fn(),
        getImages: vi.fn(),
    },
}));

const mocked = vi.mocked(backend);

const written = {
    _id: "id-1",
    slug: "nioh-3",
    title: "Nioh 3",
    type: "game",
    status: "done",
    rating: 4,
    genres: [],
    review: { story: "A long paragraph about the story.", gameplay: "", graphics: "", sound: "" },
    image_path: "",
    release_date: "",
    date_completed: "2026-01-01",
    creator: "",
};

/** Move the shared clock. Boot is a timeline now, so timers do not drive it. */
const advance = async (seconds: number) => {
    await act(async () => {
        gsap.globalTimeline.time(gsap.globalTimeline.time() + seconds);
    });
};

const showReview = async () => {
    const result = render(
        <BootSequenceProvider>
            <MemoryRouter initialEntries={["/games/nioh-3"]}>
                <Routes>
                    <Route path="/:category/:slug" element={<ReviewDetail />} />
                </Routes>
            </MemoryRouter>
        </BootSequenceProvider>,
    );
    await act(async () => { await Promise.resolve(); });
    // Twice, and the second one matters: boot *finishing* is what starts the
    // entrances, so they begin at the clock position the first advance left
    // us at and need their own time to run in.
    await advance(10);
    await advance(5);
    return result;
};

beforeEach(() => {
    vi.clearAllMocks();
    setMotionOverride("on");
    mocked.getReviews.mockResolvedValue([written] as never);
    mocked.getAudioTracks.mockResolvedValue([]);
    mocked.getImages.mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    resetMotionOverride();
});

/**
 * With motion *on* — the rest of this page's suite disables it, so nothing
 * there ever exercised an entrance actually running.
 */
describe("the detail page's entrance", () => {
    it("leaves the critique readable once its fade has finished", async () => {
        await showReview();

        const prose = document.querySelector('[data-critique-prose]') as HTMLElement | null;

        expect(prose).not.toBeNull();
        expect(prose!.style.opacity === '' || prose!.style.opacity === '1').toBe(true);
    });

    it("leaves the panel's own chrome readable too", async () => {
        await showReview();

        const chrome = document.querySelector('[data-detail-chrome]') as HTMLElement;

        expect(chrome.style.opacity === '' || chrome.style.opacity === '1').toBe(true);
    });

    it("shows the review", async () => {
        await showReview();
        expect(screen.getAllByText("Nioh 3").length).toBeGreaterThan(0);
    });
});
