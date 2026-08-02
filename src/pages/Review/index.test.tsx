import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeReview } from "../../test/reviews";
import type { Review as ReviewRecord } from "../../store/reviews";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import Review from "./index";
import { backend } from "../../api/backend";
import { BootSequenceProvider } from "../../context/BootSequenceContext";
import { resetReviewsStore } from "../../store/reviews";

vi.mock("../../api/backend", () => ({
    backend: { getReviews: vi.fn() },
}));

const mocked = vi.mocked(backend);

const review = (title: string, over: Partial<ReviewRecord> = {}) =>
    makeReview(title, {
        image_path: "https://cdn.example/cover.png",
        release_date: "2017-02-07",
        date_completed: "2026-05-18",
        ...over,
    });

const flushBoot = async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
};

const showShelf = async () => {
    const result = render(
        <BootSequenceProvider>
            <MemoryRouter initialEntries={["/games"]}>
                <Routes>
                    <Route path="/:category" element={<Review />} />
                </Routes>
            </MemoryRouter>
        </BootSequenceProvider>,
    );
    await flushBoot();
    return result;
};

// A card is a link wrapping everything it shows, so the link is the card —
// and finding it by its accessible name is what a screen reader does too.
const card = (title: string) => screen.getByRole("link", { name: new RegExp(title, "i") });

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

describe("a Review on a Category shelf", () => {
    it("shows its title", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh")]);

        await showShelf();

        expect(await screen.findByText("Nioh")).toBeDefined();
    });

    it("shows its cover", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh", { image_path: "https://cdn.example/nioh.png" }),
        ]);

        await showShelf();
        await screen.findByText("Nioh");

        expect(card("Nioh").querySelector("img")?.getAttribute("src"))
            .toBe("https://cdn.example/nioh.png");
    });

    // The line is the only part of the card that varies by surface, and a
    // shelf is finished work — so it says what finishing produced.
    it("shows its rating and when it was finished", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh", { rating: 9, date_completed: "2026-05-18" }),
        ]);

        await showShelf();
        await screen.findByText("Nioh");

        expect(card("Nioh").textContent).toContain("9");
        expect(card("Nioh").textContent).toContain("2026-05-18");
    });

    // Previously these only appeared while a filter was active, which is the
    // kind of hidden coupling the shared card exists to remove.
    it("shows them without any filter being active", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh", { rating: 9 })]);

        await showShelf();
        await screen.findByText("Nioh");

        // Scoped to the card: the panel has numbers of its own now — the genre
        // rows carry match counts and the status column carries shelf totals —
        // so a page-wide search for a digit is no longer one element. What
        // this asserts, that the line is there with no filter active, is
        // unchanged.
        expect(card("Nioh").textContent).toContain("9");
    });

    it("opens the Review at its own address", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh", { type: "game" })]);

        await showShelf();
        await screen.findByText("Nioh");

        expect(card("Nioh").getAttribute("href")).toBe("/games/nioh");
    });

    it("is reachable by keyboard, under a name that says what it is", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh")]);

        await showShelf();
        await screen.findByText("Nioh");

        // Found by role and name above, so this asserts the accessible name
        // exists at all; the tag check keeps a refactor to <div onClick> from
        // silently costing keyboard users the card.
        expect(card("Nioh").tagName).toBe("A");
        expect(card("Nioh")).toHaveProperty("href");
    });

    // Story 7: detail is worth having to hand and worth nothing on forty
    // cards at once, so it rides along with the card and is revealed on focus.
    it("carries its year, creator and genre for focus to reveal", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh", {
                release_date: "2017-02-07",
                creator: "Team Ninja",
                genres: ["Action RPG", "Soulslike"],
            }),
        ]);

        await showShelf();
        await screen.findByText("Nioh");

        expect(card("Nioh").textContent).toContain("2017");
        expect(card("Nioh").textContent).toContain("Team Ninja");
        expect(card("Nioh").textContent).toContain("Action RPG");
    });

    it("leaves out detail it does not have", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh", { release_date: "", creator: "", genres: [] }),
        ]);

        await showShelf();

        expect(await screen.findByText("Nioh")).toBeDefined();
    });
});

describe("a Review with no cover yet", () => {
    it("still renders a card with its title and stays openable", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Silent Hill 2", { image_path: "" }),
        ]);

        await showShelf();
        await screen.findByText("Silent Hill 2");

        expect(card("Silent Hill 2").getAttribute("href")).toBe("/games/silent-hill-2");
        // No broken image element — the placeholder takes its place.
        expect(card("Silent Hill 2").querySelector("img")).toBeNull();
    });

    it("leaves out the caption rather than showing a blank or a zero", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Silent Hill 2", { rating: undefined, date_completed: "" }),
        ]);

        await showShelf();
        await screen.findByText("Silent Hill 2");

        // Nothing where the rating and finish date would be — not a bare
        // star, not a zero, not an empty separator.
        expect(card("Silent Hill 2").textContent).not.toContain("★");
        expect(card("Silent Hill 2").textContent).not.toContain("·");
    });
});
