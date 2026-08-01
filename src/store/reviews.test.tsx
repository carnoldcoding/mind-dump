import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
// From "react-router", not "react-router-dom": the pages import their hooks
// from the former, and the two resolve to separate module instances here — a
// Router from the wrong one provides a context the pages never see.
import { MemoryRouter, Route, Routes } from "react-router";
import Review from "../pages/Review";
import Search from "../pages/Search";
import { ReviewList } from "../pages/System/components/ReviewPanel/ReviewList";
import { backend } from "../api/backend";
import { BootSequenceProvider } from "../context/BootSequenceContext";
import { resetReviewsStore } from "./reviews";

// The app's single boundary to the server — faking it here is what lets these
// tests drive whole surfaces as a user without knowing how they're built.
// Nothing below asserts on the store itself: its shape is implementation, and
// tests that reached into it would break on every refactor of it.
vi.mock("../api/backend", () => ({
    backend: {
        getReviews: vi.fn(),
        getCreators: vi.fn(),
        saveReview: vi.fn(),
        deleteReview: vi.fn(),
        getAudioTracks: vi.fn(),
        getImages: vi.fn(),
        deleteAudioTrack: vi.fn(),
        deleteImage: vi.fn(),
        uploadUrl: vi.fn(),
    },
}));

const mocked = vi.mocked(backend);

const review = (title: string, over: Record<string, unknown> = {}) => ({
    _id: `id-${title}`,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    type: "game",
    status: "done",
    rating: 8,
    genres: [],
    review: {},
    image_path: "",
    release_date: "01/01/1999",
    date_completed: "2026-01-01",
    ...over,
});

// Boot gates every public page's first reveal behind a chain of timers. Fake
// timers plus a flush gets a test past it without waiting three real seconds.
const flushBoot = async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
};

const renderRoute = (path: string) =>
    render(
        <BootSequenceProvider>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/search" element={<Search />} />
                    <Route path="/reviews/:category" element={<Review />} />
                </Routes>
            </MemoryRouter>
        </BootSequenceProvider>,
    );

// Asserts on what comes before what on screen, without caring which element
// the title happens to be rendered into.
const precedes = (earlier: string, later: string) => {
    const position = screen.getByText(earlier).compareDocumentPosition(screen.getByText(later));
    return Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING);
};

const showCategory = async (category: string) => {
    const result = renderRoute(`/reviews/${category}`);
    await flushBoot();
    return result;
};

beforeEach(() => {
    vi.stubEnv("VITE_DISABLE_ANIMATIONS", "true");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Module-level state outlives a single test in a way component state never
    // did — without this, the second test in the file sees the first's data.
    resetReviewsStore();
    vi.clearAllMocks();
    mocked.getCreators.mockResolvedValue([]);
    mocked.getAudioTracks.mockResolvedValue([]);
    mocked.getImages.mockResolvedValue([]);
    mocked.saveReview.mockResolvedValue({});
});

afterEach(() => {
    // vitest isn't configured with globals, so Testing Library's automatic
    // cleanup never registers — without this every render accumulates.
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe("the shared Review collection", () => {
    it("is fetched once however many surfaces read it", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh")]);

        await showCategory("games");
        await screen.findByText("Nioh");
        cleanup();

        // Navigating to another shelf, and then to Search — the same
        // collection each time, and no reason to ask for it again.
        await showCategory("cinema");
        cleanup();

        renderRoute("/search");
        await flushBoot();

        expect(mocked.getReviews).toHaveBeenCalledTimes(1);
    });

    it("shows each Category only its own Reviews", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh", { type: "game" }),
            review("Inception", { type: "cinema" }),
        ]);

        await showCategory("games");

        expect(await screen.findByText("Nioh")).toBeDefined();
        expect(screen.queryByText("Inception")).toBeNull();
    });

    it("survives the fetch failing without the page falling over", async () => {
        mocked.getReviews.mockRejectedValue(new Error("offline"));

        await showCategory("games");

        // Specific, not just /error/i: the message has to survive, and a
        // looser match happily passed while the page rendered a bare "Error:".
        expect(await screen.findByText(/network error/i)).toBeDefined();
    });
});

describe("ordering by when I finished something", () => {
    it("puts the most recently finished first, whatever the release dates say", async () => {
        mocked.getReviews.mockResolvedValue([
            // Released last, finished first: release order and completion
            // order disagree, so only one of them can produce this sequence.
            review("Finished First", { release_date: "12/12/2024", date_completed: "2026-01-05" }),
            review("Finished Last", { release_date: "01/01/1990", date_completed: "2026-07-05" }),
            review("Finished Between", { release_date: "06/06/2010", date_completed: "2026-03-20" }),
        ]);

        await showCategory("games");
        await screen.findByText("Finished Last");

        expect(precedes("Finished Last", "Finished Between")).toBe(true);
        expect(precedes("Finished Between", "Finished First")).toBe(true);
    });

    // Story 5: the System list's "Date" sort is the one whose label was
    // lying, so it gets its own test rather than riding on the grid's.
    it("sorts the System list by completion date, not release date", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Old Game New Finish", { release_date: "01/01/1990", date_completed: "2026-07-05" }),
            review("New Game Old Finish", { release_date: "12/12/2024", date_completed: "2026-01-05" }),
        ]);

        render(<ReviewList />);
        await screen.findByText("Old Game New Finish");

        fireEvent.click(screen.getByText("date"));

        // Most recently finished first, which is the opposite of release order.
        expect(precedes("Old Game New Finish", "New Game Old Finish")).toBe(true);

        // Flipped, the oldest finish leads.
        fireEvent.click(screen.getByText("date"));
        expect(precedes("New Game Old Finish", "Old Game New Finish")).toBe(true);
    });
});

describe("the editor's Release Date control", () => {
    // A native <input type="date"> renders blank for anything that isn't ISO,
    // so a US-format release date showed as empty and cleared itself on save.
    it("shows a US-format release date instead of coming up blank", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Nioh", { release_date: "02/07/2017" }),
        ]);

        render(<ReviewList />);
        fireEvent.click(await screen.findByText("Nioh"));

        const released = await screen.findByLabelText("Release Date");
        expect((released as HTMLInputElement).value).toBe("2017-02-07");
    });

    it("leaves a release date that is already ISO alone", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Doom", { release_date: "2016-05-13" }),
        ]);

        render(<ReviewList />);
        fireEvent.click(await screen.findByText("Doom"));

        const released = await screen.findByLabelText("Release Date");
        expect((released as HTMLInputElement).value).toBe("2016-05-13");
    });
});

describe("a write from System", () => {
    it("is reflected the next time a surface reads the collection", async () => {
        mocked.getReviews.mockResolvedValue([review("Nioh")]);

        render(<ReviewList />);
        await screen.findByText("Nioh");

        // The collection the refetch will land on.
        mocked.getReviews.mockResolvedValue([review("Nioh"), review("Onimusha")]);

        fireEvent.click(screen.getByText("Add Review"));

        const title = await screen.findByLabelText("Title");
        fireEvent.change(title, { target: { value: "Onimusha" } });
        fireEvent.click(screen.getByText("Save"));

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({ title: "Onimusha" });
        // The write invalidated the collection, so it was asked for again.
        await waitFor(() => expect(mocked.getReviews).toHaveBeenCalledTimes(2));
        expect(await screen.findByText("Onimusha")).toBeDefined();
    });
});
