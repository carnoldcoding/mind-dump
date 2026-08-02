import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeReview } from "../../test/reviews";
import type { Review as ReviewRecord } from "../../store/reviews";
import { render, screen, cleanup, act, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import Backlog from "./index";
import { backend } from "../../api/backend";
import { BootSequenceProvider } from "../../context/BootSequenceContext";
import { resetReviewsStore } from "../../store/reviews";

vi.mock("../../api/backend", () => ({
    backend: { getReviews: vi.fn() },
}));

const mocked = vi.mocked(backend);

const review = (title: string, over: Partial<ReviewRecord> = {}) =>
    makeReview(title, {
        status: "todo",
        rating: 0,
        date_completed: "",
        ...over,
    });

const flushBoot = async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
};

const showBacklog = async () => {
    const result = render(
        <BootSequenceProvider>
            <MemoryRouter initialEntries={["/backlog"]}>
                <Routes>
                    <Route path="/backlog" element={<Backlog />} />
                </Routes>
            </MemoryRouter>
        </BootSequenceProvider>,
    );
    await flushBoot();
    return result;
};

const shelf = (name: string) => screen.getByRole("list", { name });

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

// The heart of the model: membership is derived from Status and nothing else,
// so these three cases are the whole definition of what the Backlog is.
describe("what is on the Backlog", () => {
    it("carries a Review while it is queued", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh 3", { status: "todo" })]);

        await showBacklog();

        expect(await screen.findByText("Nioh 3")).toBeDefined();
    });

    it("still carries it once it has been started", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh 3", { status: "active" })]);

        await showBacklog();

        expect(await screen.findByText("Nioh 3")).toBeDefined();
    });

    it("drops it once it is finished", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { status: "done", date_completed: "2026-07-05" }),
            review("Onimusha", { status: "todo" }),
        ]);

        await showBacklog();

        await screen.findByText("Onimusha");
        expect(screen.queryByText("Nioh 3")).toBeNull();
    });

    it("says so plainly when nothing is unfinished", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Doom", { status: "done", date_completed: "2026-05-18" }),
        ]);

        await showBacklog();

        expect(await screen.findByText(/nothing unfinished/i)).toBeDefined();
    });
});

describe("started and unstarted", () => {
    it("separates what has been started from what has not", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Started Thing", { status: "active" }),
            review("Queued Thing", { status: "todo" }),
        ]);

        await showBacklog();
        await screen.findByText("Started Thing");

        expect(within(shelf("Started")).getByText("Started Thing")).toBeDefined();
        expect(within(shelf("Not Started")).getByText("Queued Thing")).toBeDefined();
    });

    it("leaves out a section with nothing in it", async () => {
        mocked.getReviews.mockResolvedValue([review("Queued Thing", { status: "todo" })]);

        await showBacklog();
        await screen.findByText("Queued Thing");

        expect(screen.queryByRole("list", { name: "Started" })).toBeNull();
    });
});

describe("the shelf as a grid", () => {
    it("shows every unfinished Review as a card with its cover", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { status: "todo", image_path: "https://cdn.example/n.png" }),
        ]);

        await showBacklog();
        await screen.findByText("Nioh 3");

        const card = screen.getByRole("link", { name: /Nioh 3/ });
        expect(card.querySelector("img")?.getAttribute("src")).toBe("https://cdn.example/n.png");
    });

    it("counts what is on each shelf", async () => {
        mocked.getReviews.mockResolvedValue([
            review("A", { status: "todo" }),
            review("B", { status: "todo" }),
            review("C", { status: "active" }),
        ]);

        await showBacklog();
        await screen.findByText("A");

        // "Started" is a substring of "Not Started", so both need anchoring.
        expect(screen.getByRole("heading", { name: /^Not Started/ }).textContent).toContain("2");
        expect(screen.getByRole("heading", { name: /^Started/ }).textContent).toContain("1");
    });
});

describe("narrowing to one Category", () => {
    it("shows only that Category once filtered", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Some Game", { type: "game", status: "todo" }),
            review("Some Book", { type: "book", status: "todo" }),
        ]);

        await showBacklog();
        await screen.findByText("Some Game");

        fireEvent.click(screen.getByRole("button", { name: "Books" }));

        expect(screen.getByText("Some Book")).toBeDefined();
        expect(screen.queryByText("Some Game")).toBeNull();
    });

    it("comes back to everything when All is chosen again", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Some Game", { type: "game", status: "todo" }),
            review("Some Book", { type: "book", status: "todo" }),
        ]);

        await showBacklog();
        await screen.findByText("Some Game");

        fireEvent.click(screen.getByRole("button", { name: "Books" }));
        fireEvent.click(screen.getByRole("button", { name: "All" }));

        expect(screen.getByText("Some Game")).toBeDefined();
        expect(screen.getByText("Some Book")).toBeDefined();
    });
});

describe("the shelf is read-only", () => {
    it("opens a queued Review at its own address", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh 3", { type: "game", status: "todo" }),
        ]);

        await showBacklog();

        expect((await screen.findByText("Nioh 3")).closest("a")?.getAttribute("href"))
            .toBe("/games/nioh-3");
    });

    it("offers no way to capture or change anything", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh 3", { status: "todo" })]);

        await showBacklog();
        await screen.findByText("Nioh 3");

        // The only buttons here are the Category filters — writing lives in
        // System, which keeps public pages read-only (story 21).
        const buttonNames = screen.getAllByRole("button").map(b => b.textContent);
        expect(buttonNames).toEqual(["All", "Games", "Cinema", "Books"]);
    });
});
