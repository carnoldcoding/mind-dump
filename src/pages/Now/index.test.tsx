import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import Now from "./index";
import { backend } from "../../api/backend";
import { BootSequenceProvider } from "../../context/BootSequenceContext";
import { resetReviewsStore } from "../../store/reviews";

vi.mock("../../api/backend", () => ({
    backend: { getReviews: vi.fn() },
}));

const mocked = vi.mocked(backend);

const review = (title: string, over: Record<string, unknown> = {}) => ({
    _id: `id-${title}`,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    type: "game",
    status: "active",
    rating: 0,
    genres: [],
    review: {},
    image_path: "",
    release_date: "1999-01-01",
    date_completed: "",
    ...over,
});

const flushBoot = async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
};

const showNow = async () => {
    const result = render(
        <BootSequenceProvider>
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<Now />} />
                </Routes>
            </MemoryRouter>
        </BootSequenceProvider>,
    );
    await flushBoot();
    return result;
};

// Each band is labelled, so a test can ask "what is in this band" rather than
// "what is on the page" — which is the whole point of there being three.
const band = (name: RegExp | string) => screen.getByRole("region", { name });

beforeEach(() => {
    vi.stubEnv("VITE_DISABLE_ANIMATIONS", "true");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    resetReviewsStore();
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe("the in-progress band", () => {
    it("shows what is being played, watched and read, grouped by activity", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { type: "game", status: "active" }),
            review("Frieren", { type: "cinema", status: "active" }),
            review("Project Hail Mary", { type: "book", status: "active" }),
        ]);

        await showNow();
        const inProgress = band("In Progress");

        expect(within(within(inProgress).getByRole("list", { name: "PLAYING" })).getByText("Nioh 3")).toBeDefined();
        expect(within(within(inProgress).getByRole("list", { name: "WATCHING" })).getByText("Frieren")).toBeDefined();
        expect(within(within(inProgress).getByRole("list", { name: "READING" })).getByText("Project Hail Mary")).toBeDefined();
    });

    it("leaves out a Category with nothing in progress", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { type: "game", status: "active" }),
        ]);

        await showNow();

        expect(screen.queryByRole("list", { name: "WATCHING" })).toBeNull();
    });

    it("says so plainly when nothing is in progress", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Doom", { status: "done", date_completed: "2026-05-18" }),
        ]);

        await showNow();

        expect(within(band("In Progress")).getByText(/nothing in progress/i)).toBeDefined();
    });

    it("links a row through to its Review", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { type: "game", status: "active" }),
        ]);

        await showNow();

        expect(screen.getByText("Nioh 3").closest("a")?.getAttribute("href")).toBe("/games/nioh-3");
    });
});

describe("the up-next band", () => {
    it("caps what it shows and offers a way through to the Backlog", async () => {
        mocked.getReviews.mockResolvedValue(
            Array.from({ length: 8 }, (_, i) => review(`Queued ${i}`, { status: "todo" })),
        );

        await showNow();
        const upNext = band("Up Next");

        expect(within(upNext).getAllByRole("listitem")).toHaveLength(5);
        // The cap is a doorway, not a dead end (story 5).
        expect(within(upNext).getByRole("link", { name: /backlog/i }).getAttribute("href")).toBe("/backlog");
    });

    // The Backlog is everything unfinished, so it has contents even when
    // nothing is queued — the way through has to stay open.
    it("still offers the way through when nothing is queued", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { status: "active" }),
        ]);

        await showNow();
        const upNext = band("Up Next");

        expect(within(upNext).getByText(/nothing queued/i)).toBeDefined();
        expect(within(upNext).getByRole("link", { name: /backlog/i })).toBeDefined();
    });

    it("says so plainly when nothing is queued", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { status: "active" }),
        ]);

        await showNow();

        expect(within(band("Up Next")).getByText(/nothing queued/i)).toBeDefined();
    });
});

describe("the recently-finished band", () => {
    it("orders by when I finished, not when it came out, and caps at five", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Finished First", { status: "done", release_date: "2024-12-12", date_completed: "2026-01-05" }),
            review("Finished Last", { status: "done", release_date: "1990-01-01", date_completed: "2026-07-05" }),
            review("Finished Between", { status: "done", release_date: "2010-06-06", date_completed: "2026-03-20" }),
            review("Older A", { status: "done", date_completed: "2025-01-01" }),
            review("Older B", { status: "done", date_completed: "2025-01-02" }),
            review("Oldest", { status: "done", date_completed: "2024-01-01" }),
        ]);

        await showNow();
        const finished = band("Recently Finished");
        const rows = within(finished).getAllByRole("listitem");

        expect(rows).toHaveLength(5);
        expect(rows[0].textContent).toContain("Finished Last");
        expect(rows[1].textContent).toContain("Finished Between");
        expect(rows[2].textContent).toContain("Finished First");
        expect(within(finished).queryByText("Oldest")).toBeNull();
    });

    it("carries the rating alongside each finished Review", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Doom", { status: "done", rating: 9, date_completed: "2026-05-18" }),
        ]);

        await showNow();

        expect(within(band("Recently Finished")).getByText(/9/)).toBeDefined();
    });

    // Absence and zero are different things: unrated work stores a 0, and so
    // does work genuinely rated 0.
    it("shows a rating of zero rather than treating it as no rating", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Bad Game", { status: "done", rating: 0, date_completed: "2026-05-18" }),
        ]);

        await showNow();

        expect(within(band("Recently Finished")).getByText(/0/)).toBeDefined();
    });

    it("says so plainly when nothing is finished", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { status: "active" }),
        ]);

        await showNow();

        expect(within(band("Recently Finished")).getByText(/nothing finished/i)).toBeDefined();
    });
});
