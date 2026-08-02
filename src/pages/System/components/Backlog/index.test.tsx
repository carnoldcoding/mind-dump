import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeReview } from "../../../../test/reviews";
import type { Review as ReviewRecord } from "../../../../store/reviews";
import { render, screen, cleanup, act, fireEvent, waitFor, within } from "@testing-library/react";
import BacklogWindow from "./index";
import ReviewsWindow from "../ReviewsWindow";
import { backend } from "../../../../api/backend";
import { resetReviewsStore } from "../../../../store/reviews";

vi.mock("../../../../api/backend", () => ({
    backend: {
        getReviews: vi.fn(),
        searchMetadata: vi.fn(),
        metadataDetails: vi.fn(),
        storeCover: vi.fn(),
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

// Charts need a real canvas and jsdom has none. Rendering the row count is
// what lets a test say "the charts still count everything" without asserting
// on chart internals.
vi.mock("../pieChart", () => ({
    PieChart: ({ data }: { data: unknown[] }) => <div data-testid="pie">{data.length}</div>,
}));
vi.mock("../barChart", () => ({
    BarChart: ({ data }: { data: unknown[] }) => <div data-testid="bar">{data.length}</div>,
}));

const mocked = vi.mocked(backend);

const review = (title: string, over: Partial<ReviewRecord> = {}) =>
    makeReview(title, {
        status: "todo",
        rating: 0,
        date_completed: "",
        ...over,
    });

// Waits on the fetch rather than on any particular row: finished Reviews are
// deliberately absent from this window, so a title is not a reliable signal
// that the collection has landed.
const showFolder = async (docs: ReturnType<typeof review>[]) => {
    mocked.getReviews.mockResolvedValue(docs);
    const result = render(<BacklogWindow onClose={() => {}} />);
    await waitFor(() => expect(mocked.getReviews).toHaveBeenCalled());
    await act(async () => {});
    return result;
};

const captureButton = () => screen.getByRole("button", { name: "Capture" });

const capture = (title: string) => {
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: title } });
    fireEvent.click(captureButton());
};

beforeEach(() => {
    vi.stubEnv("VITE_DISABLE_ANIMATIONS", "true");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 1, 9, 0, 0));
    resetReviewsStore();
    vi.clearAllMocks();
    mocked.saveReview.mockResolvedValue({});
    // Capture searches as you type; suites that are not about the lookup get
    // an empty, successful one so they exercise the capture-by-title path.
    mocked.searchMetadata.mockResolvedValue({ results: [] });
    mocked.metadataDetails.mockResolvedValue({ result: null });
    mocked.storeCover.mockResolvedValue({ url: 'https://cdn.example/stored.jpg' });
    mocked.deleteReview.mockResolvedValue({});
    mocked.getCreators.mockResolvedValue([]);
    mocked.getAudioTracks.mockResolvedValue([]);
    mocked.getImages.mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe("capture", () => {
    // Story 1: a title and a Category and nothing else. ADR-0004: it is a
    // Review, not a new kind of document.
    it("writes one queued Review with a derived slug and nothing else", async () => {
        await showFolder([]);

        capture("Silent Hill 2");

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        const [payload, isUpdate] = mocked.saveReview.mock.calls[0];
        expect(payload).toEqual({
            title: "Silent Hill 2",
            slug: "silent-hill-2",
            type: "game",
            status: "todo",
        });
        expect(isUpdate).toBe(false);
    });

    it("captures into the Category that was chosen", async () => {
        await showFolder([]);

        // SelectField opens on click and commits on mousedown, so that the
        // choice lands before the container's blur closes the list.
        fireEvent.click(screen.getByText("Category"));
        fireEvent.mouseDown(screen.getByText("book"));
        capture("Project Hail Mary");

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({ type: "book" });
    });

    it("re-reads the collection so the new item appears", async () => {
        await showFolder([]);

        capture("Silent Hill 2");

        await waitFor(() => expect(mocked.getReviews).toHaveBeenCalledTimes(2));
    });

    // Story 3 asks to *know* whether it's already in there — not to be
    // stopped. A remake shares its original's title and is worth having.
    it("says when the thing is already in there, without refusing the capture", async () => {
        await showFolder([review("Nioh 3", { status: "done" })]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Nioh 3" } });

        expect(screen.getByText(/already captured/i)).toBeDefined();

        fireEvent.click(captureButton());
        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
    });

    it("does not write twice when Capture is pressed twice", async () => {
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Silent Hill 2" } });
        // The same element twice in one tick — a real double-press, before any
        // re-render can swap the label or disable it.
        const button = captureButton();
        fireEvent.click(button);
        fireEvent.click(button);

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview).toHaveBeenCalledTimes(1);
    });

    it("refuses an empty title", async () => {
        await showFolder([]);

        fireEvent.click(captureButton());

        expect(mocked.saveReview).not.toHaveBeenCalled();
    });
});

// Typing searches the provider; choosing a result IS the capture.
describe("capture by lookup", () => {
    const candidate = (over = {}) => ({
        sourceId: "9767",
        title: "Nioh",
        release_date: "2017-02-07",
        creator: null,
        genres: [],
        platforms: [],
        description: null,
        image: null,
        ...over,
    });

    // The debounce means typing a title is one request rather than a dozen.
    const settleSearch = async () => {
        await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    };

    it("searches the provider for the chosen Category as you type", async () => {
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();

        expect(mocked.searchMetadata).toHaveBeenCalledWith("game", "nioh");
    });

    it("asks once for a title typed in one go, not once per keystroke", async () => {
        await showFolder([]);

        const field = screen.getByLabelText("Title");
        for (const value of ["n", "ni", "nio", "nioh"]) {
            fireEvent.change(field, { target: { value } });
        }
        await settleSearch();

        expect(mocked.searchMetadata).toHaveBeenCalledTimes(1);
    });

    it("shows each match with the year that tells a remake from its original", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [
                candidate({ sourceId: "1", title: "Silent Hill 2", release_date: "2001-09-24" }),
                candidate({ sourceId: "2", title: "Silent Hill 2", release_date: "2024-10-08" }),
            ],
        });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "silent hill 2" } });
        await settleSearch();

        const matches = within(screen.getByRole("list", { name: "Matches" })).getAllByRole("button");
        expect(matches).toHaveLength(2);
        expect(matches[0].textContent).toContain("2001");
        expect(matches[1].textContent).toContain("2024");
    });

    it("captures the match that was chosen, not the one that ranked first", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [
                candidate({ sourceId: "1", title: "Silent Hill 2", release_date: "2001-09-24" }),
                candidate({ sourceId: "2", title: "Silent Hill 2", release_date: "2024-10-08" }),
            ],
        });
        mocked.metadataDetails.mockResolvedValue({
            result: candidate({ sourceId: "2", title: "Silent Hill 2", release_date: "2024-10-08", creator: "Bloober Team" }),
        });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "silent hill 2" } });
        await settleSearch();

        const matches = within(screen.getByRole("list", { name: "Matches" })).getAllByRole("button");
        fireEvent.click(matches[1]);

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({
            title: "Silent Hill 2",
            status: "todo",
            release_date: "2024-10-08",
            creator: "Bloober Team",
        });
    });

    // The fields that only exist in the per-record response are the whole
    // reason a chosen candidate is fetched again.
    it("fetches the full record before writing", async () => {
        mocked.searchMetadata.mockResolvedValue({ results: [candidate()] });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("list", { name: "Matches" })).getAllByRole("button")[0]);

        await waitFor(() => expect(mocked.metadataDetails).toHaveBeenCalledWith("game", "9767"));
    });

    it("derives the slug from the chosen title rather than what was typed", async () => {
        mocked.searchMetadata.mockResolvedValue({ results: [candidate({ title: "Nioh 2" })] });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nio 2 typo" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("list", { name: "Matches" })).getAllByRole("button")[0]);

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({ slug: "nioh-2" });
    });

    it("copies the cover onto our own storage", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [candidate({ image: "https://media.rawg.io/nioh.jpg" })],
        });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("list", { name: "Matches" })).getAllByRole("button")[0]);

        await waitFor(() => expect(mocked.storeCover).toHaveBeenCalledWith("https://media.rawg.io/nioh.jpg"));
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({
            image_path: "https://cdn.example/stored.jpg",
        });
    });

    // A storage problem should not cost the capture.
    it("still captures when the cover cannot be copied", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [candidate({ image: "https://media.rawg.io/nioh.jpg" })],
        });
        mocked.storeCover.mockRejectedValue(new Error("R2 down"));
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("list", { name: "Matches" })).getAllByRole("button")[0]);

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0].image_path).toBeUndefined();
    });

    it("writes only what the candidate actually knew", async () => {
        mocked.searchMetadata.mockResolvedValue({ results: [candidate()] });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("list", { name: "Matches" })).getAllByRole("button")[0]);

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        const written = mocked.saveReview.mock.calls[0][0];
        // Absent, not null and not an empty array.
        expect(written).not.toHaveProperty("creator");
        expect(written).not.toHaveProperty("genres");
    });
});

describe("when the lookup cannot help", () => {
    const settleSearch = async () => {
        await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    };

    // "Nothing matched" and "the lookup is broken" are different facts, and
    // reading one as the other answers "is this already in there?" wrongly.
    it("says a failed lookup is a failure, not an absence", async () => {
        mocked.searchMetadata.mockRejectedValue(new Error("502"));
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();

        expect(screen.getByText(/lookup unavailable/i)).toBeDefined();
        expect(screen.queryByText(/no matches/i)).toBeNull();
    });

    it("says an empty result is an absence, not a failure", async () => {
        mocked.searchMetadata.mockResolvedValue({ results: [] });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "obscure thing" } });
        await settleSearch();

        expect(screen.getByText(/no matches/i)).toBeDefined();
        expect(screen.queryByText(/lookup unavailable/i)).toBeNull();
    });

    it("still records the title when the lookup has failed", async () => {
        mocked.searchMetadata.mockRejectedValue(new Error("502"));
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Obscure Thing" } });
        await settleSearch();
        fireEvent.click(captureButton());

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toEqual({
            title: "Obscure Thing",
            slug: "obscure-thing",
            type: "game",
            status: "todo",
        });
    });
});

describe("grooming", () => {
    it("starts something that was queued", async () => {
        await showFolder([review("Nioh 3", { status: "todo" })]);

        fireEvent.click(screen.getByText("Start"));

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({
            slug: "nioh-3",
            status: "active",
        });
        expect(mocked.saveReview.mock.calls[0][1]).toBe(true);
    });

    it("finishes something that was started, stamping today", async () => {
        await showFolder([review("Nioh 3", { status: "active" })]);

        fireEvent.click(screen.getByText("Finish"));

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({
            status: "done",
            date_completed: "2026-08-01",
        });
    });

    // Story 19: the handoff to the Reviews window is a real seam, so it is
    // said out loud rather than automated.
    it("points at the Reviews folder once something is finished", async () => {
        await showFolder([review("Nioh 3", { status: "active" })]);

        fireEvent.click(screen.getByText("Finish"));

        expect(await screen.findByText(/write it up in the reviews folder/i)).toBeDefined();
    });

    it("removes something gone off", async () => {
        await showFolder([review("Nioh 3", { status: "todo" })]);

        fireEvent.click(screen.getByLabelText("Remove Nioh 3"));

        await waitFor(() => expect(mocked.deleteReview).toHaveBeenCalledWith("nioh-3"));
    });

    it("offers Start on queued items and Finish on started ones, not the other way round", async () => {
        await showFolder([
            review("Queued Thing", { status: "todo" }),
            review("Started Thing", { status: "active" }),
        ]);

        const started = within(screen.getByRole("list", { name: "Started" }));
        const notStarted = within(screen.getByRole("list", { name: "Not Started" }));

        expect(notStarted.getByText("Start")).toBeDefined();
        expect(notStarted.queryByText("Finish")).toBeNull();
        expect(started.getByText("Finish")).toBeDefined();
        expect(started.queryByText("Start")).toBeNull();
    });

    // Story 16: the Reviews window shows finished work only now, so if the
    // heavier fields aren't reachable here they aren't reachable anywhere.
    it("opens the full editor on a queued Review", async () => {
        await showFolder([review("Nioh 3", { status: "todo" })]);

        fireEvent.click(screen.getByLabelText("Edit Nioh 3"));

        // The editor loads the Review it was handed.
        expect(await screen.findByDisplayValue("Nioh 3")).toBeDefined();
    });

    it("opens the full editor on a started Review too", async () => {
        await showFolder([review("Frieren", { status: "active" })]);

        fireEvent.click(screen.getByLabelText("Edit Frieren"));

        expect(await screen.findByDisplayValue("Frieren")).toBeDefined();
    });

    it("leaves finished work alone", async () => {
        await showFolder([
            review("Nioh 3", { status: "todo" }),
            review("Doom", { status: "done", date_completed: "2026-05-18" }),
        ]);

        expect(screen.queryByText("Doom")).toBeNull();
    });
});

describe("the Reviews window, narrowed", () => {
    // Story 17: the place critiques are written is no longer the place the
    // queue lives.
    it("lists finished work only", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Doom", { status: "done", date_completed: "2026-05-18" }),
            review("Nioh 3", { status: "todo" }),
            review("Frieren", { status: "active" }),
        ]);

        render(<ReviewsWindow onClose={() => {}} />);

        expect(await screen.findByText("Doom")).toBeDefined();
        expect(screen.queryByText("Nioh 3")).toBeNull();
        expect(screen.queryByText("Frieren")).toBeNull();
    });

    // Story 18: narrowing the list must not narrow the sense of the whole.
    it("keeps counting the whole collection in its charts", async () => {
        mocked.getReviews.mockResolvedValue([
            review("Doom", { status: "done", date_completed: "2026-05-18" }),
            review("Nioh 3", { status: "todo" }),
            review("Frieren", { status: "active" }),
        ]);

        render(<ReviewsWindow onClose={() => {}} />);
        await screen.findByText("Doom");

        expect(screen.getByTestId("pie").textContent).toBe("3");
        expect(screen.getByTestId("bar").textContent).toBe("3");
    });
});
