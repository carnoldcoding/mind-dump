import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import ReviewDetail from "./index";
import { backend } from "../../api/backend";
import { BootSequenceProvider } from "../../context/BootSequenceContext";

vi.mock("../../api/backend", () => ({
    backend: {
        getReviews: vi.fn(),
        getAudioTracks: vi.fn(),
        getImages: vi.fn(),
    },
}));

const mocked = vi.mocked(backend);

const review = (over: Record<string, unknown> = {}) => ({
    _id: "id-1",
    slug: "nioh-3",
    title: "Nioh 3",
    type: "game",
    status: "todo",
    rating: 0,
    genres: [],
    // What capture writes: a title and a Category, and nothing to read yet.
    review: { story: "", gameplay: "", graphics: "", sound: "" },
    image_path: "",
    release_date: "",
    date_completed: "",
    creator: "",
    ...over,
});

const flushBoot = async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
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
    await flushBoot();
    return result;
};

beforeEach(() => {
    vi.stubEnv("VITE_DISABLE_ANIMATIONS", "true");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    mocked.getAudioTracks.mockResolvedValue([]);
    mocked.getImages.mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

// Story 11: opening something you only queued should show what exists, not
// blanks where finished work would be.
describe("a queued Review's page", () => {
    it("shows its title", async () => {
        mocked.getReviews.mockResolvedValue([review()]);

        await showReview();

        expect(await screen.findByText("Nioh 3")).toBeDefined();
    });

    it("shows no rating", async () => {
        mocked.getReviews.mockResolvedValue([review({ status: "todo", rating: 0 })]);

        await showReview();
        await screen.findByText("Nioh 3");

        expect(screen.queryByText("0")).toBeNull();
    });

    it("shows no critique sections", async () => {
        mocked.getReviews.mockResolvedValue([review()]);

        await showReview();
        await screen.findByText("Nioh 3");

        for (const section of ["Story", "Gameplay", "Graphics", "Sound"]) {
            expect(screen.queryByText(section)).toBeNull();
        }
    });
});

describe("a finished Review's page", () => {
    it("shows the rating it earned", async () => {
        mocked.getReviews.mockResolvedValue([
            review({ status: "done", rating: 9, date_completed: "2026-07-05" }),
        ]);

        await showReview();
        await screen.findByText("Nioh 3");

        expect(screen.getByText("9")).toBeDefined();
    });

    it("shows the critique sections that were written", async () => {
        mocked.getReviews.mockResolvedValue([
            review({
                status: "done",
                rating: 9,
                review: { story: "Good", gameplay: "Great", graphics: "", sound: "" },
            }),
        ]);

        await showReview();
        await screen.findByText("Nioh 3");

        // By role, not by bare text: the critique panel names the open
        // section in a title bar of its own now, so the selected section's
        // word is on screen twice and only one of the two is the tab. What
        // this asserts — which sections you can reach — is unchanged.
        const tab = (name: string) => screen.getByRole("button", { name: new RegExp(name, "i") });

        expect(tab("Story")).toBeDefined();
        expect(tab("Gameplay")).toBeDefined();
        // Still self-hiding the ones with nothing in them.
        expect(screen.queryByRole("button", { name: /graphics/i })).toBeNull();
    });
});
