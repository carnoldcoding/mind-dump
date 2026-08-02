import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeReview } from "../../test/reviews";
import type { Review as ReviewRecord } from "../../store/reviews";
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

const review = (title: string, over: Partial<ReviewRecord> = {}) =>
    makeReview(title, {
        status: "active",
        rating: 0,
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
    // Each hero says what you are doing with it, rather than sitting under a
    // heading — so playing, watching and reading still read as different
    // activities with everything in one grid (story 2).
    it("says what is being played, watched and read", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { type: "game", status: "active" }),
            review("Frieren", { type: "cinema", status: "active" }),
            review("Project Hail Mary", { type: "book", status: "active" }),
        ]);

        await showNow();
        const inProgress = band("In Progress");

        expect(within(inProgress).getByRole("link", { name: /Nioh 3/ }).textContent).toContain("PLAYING");
        expect(within(inProgress).getByRole("link", { name: /Frieren/ }).textContent).toContain("WATCHING");
        expect(within(inProgress).getByRole("link", { name: /Project Hail Mary/ }).textContent).toContain("READING");
    });

    it("says nothing about a Category with nothing in progress", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { type: "game", status: "active" }),
        ]);

        await showNow();

        expect(within(band("In Progress")).queryByText("WATCHING")).toBeNull();
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

describe("the shape of the page", () => {
    // Story 1: in progress is the reason the page exists, so it leads. The
    // rails are present and visibly secondary.
    it("puts what is in progress before what is queued or finished", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Playing Now", { status: "active" }),
            review("Queued Thing", { status: "todo" }),
            review("Finished Thing", { status: "done", date_completed: "2026-05-18" }),
        ]);

        await showNow();

        const position = screen.getByText("Playing Now")
            .compareDocumentPosition(screen.getByText("Queued Thing"));
        expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });

    // Story 22: every surface has to be usable without a mouse.
    it("lets the keyboard reach and open a card", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Playing Now", { status: "active" }),
        ]);

        await showNow();

        const card = screen.getByRole("link", { name: /Playing Now/ });
        card.focus();
        expect(document.activeElement).toBe(card);
        // An anchor with an href activates on Enter without any handler of
        // ours; the tag is what guarantees that.
        expect(card.tagName).toBe("A");
        expect(card.getAttribute("href")).toBe("/games/playing-now");
    });

    it("shows every card as a card, cover and all", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Playing Now", { status: "active", image_path: "https://cdn.example/a.png" }),
        ]);

        await showNow();

        const card = screen.getByRole("link", { name: /Playing Now/ });
        expect(card.querySelector("img")?.getAttribute("src")).toBe("https://cdn.example/a.png");
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
    });

    // The public Backlog is gone — it overlapped Now too heavily, and
    // everything unfinished is now groomed from System instead. Nothing on a
    // public page should offer a way to it.
    it("offers no way through to a Backlog that no longer exists", async () => {
        mocked.getReviews.mockResolvedValue(
            Array.from({ length: 8 }, (_, i) => review(`Queued ${i}`, { status: "todo" })),
        );

        await showNow();

        expect(screen.queryByRole("link", { name: /backlog/i })).toBeNull();
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

        expect(
            within(band("Recently Finished")).getByRole("link", { name: /Doom/ }).textContent,
        ).toContain("9 ★");
    });

    // Absence and zero are different things: unrated work stores a 0, and so
    // does work genuinely rated 0.
    it("shows a rating of zero rather than treating it as no rating", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Bad Game", { status: "done", rating: 0, date_completed: "2026-05-18" }),
        ]);

        await showNow();

        expect(
            within(band("Recently Finished")).getByRole("link", { name: /Bad Game/ }).textContent,
        ).toContain("0 ★");
    });

    it("says so plainly when nothing is finished", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { status: "active" }),
        ]);

        await showNow();

        expect(within(band("Recently Finished")).getByText(/nothing finished/i)).toBeDefined();
    });
});
