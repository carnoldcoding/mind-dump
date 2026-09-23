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
    const result = render(<BacklogWindow />);
    await waitFor(() => expect(mocked.getReviews).toHaveBeenCalled());
    await act(async () => {});
    return result;
};

const captureButton = () => screen.getByRole("button", { name: "Capture" });

// The Capture region, scoped so its "Category" select does not collide with
// the filter strip's Category facet, which carries the same word.
const captureRegion = () => within(screen.getByRole("region", { name: "Capture" }));

// The search/filter controls live inside the Capture box, collapsed until the
// funnel toggle reveals them — so any test touching search, status, sort or a
// facet opens them first.
const openFilters = () =>
    fireEvent.click(screen.getByRole("button", { name: "Show filters" }));

/**
 * The card for a title. §3 collapsed Started and Not Started into one list of
 * rich cards, and every action — the Queued/Started status toggle, Edit, and
 * Remove — lives on the card itself, so there is nothing to select first.
 */
const cardFor = (title: string) => screen.getByText(title).closest("li") as HTMLElement;

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
        // choice lands before the container's blur closes the list. The capture
        // select carries no label now (hideLabel), so it is opened by its
        // displayed value; the filter strip's Category facet is collapsed inside
        // Capture and not rendered, so "book" is unambiguous in the region.
        fireEvent.click(captureRegion().getByText("game"));
        fireEvent.mouseDown(captureRegion().getByText("book"));
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

        const matches = within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option");
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

        const matches = within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option");
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
        fireEvent.click(within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option")[0]);

        await waitFor(() => expect(mocked.metadataDetails).toHaveBeenCalledWith("game", "9767"));
    });

    it("derives the slug from the chosen title rather than what was typed", async () => {
        mocked.searchMetadata.mockResolvedValue({ results: [candidate({ title: "Nioh 2" })] });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nio 2 typo" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option")[0]);

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({ slug: "nioh-2" });
    });

    it("copies the cover onto our own storage", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [candidate({ image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg" })],
        });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option")[0]);

        await waitFor(() => expect(mocked.storeCover).toHaveBeenCalledWith("https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg"));
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({
            image_path: "https://cdn.example/stored.jpg",
        });
    });

    // A storage problem should not cost the capture.
    it("still captures when the cover cannot be copied", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [candidate({ image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg" })],
        });
        mocked.storeCover.mockRejectedValue(new Error("R2 down"));
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option")[0]);

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0].image_path).toBeUndefined();
    });

    it("writes only what the candidate actually knew", async () => {
        mocked.searchMetadata.mockResolvedValue({ results: [candidate()] });
        await showFolder([]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "nioh" } });
        await settleSearch();
        fireEvent.click(within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option")[0]);

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        const written = mocked.saveReview.mock.calls[0][0];
        // Absent, not null and not an empty array.
        expect(written).not.toHaveProperty("creator");
        expect(written).not.toHaveProperty("genres");
    });
});

// Story 17: one interaction model for choosing from a list, matching the
// Search prompt rather than inventing a second way.
describe("choosing a match without a mouse", () => {
    const candidate = (over = {}) => ({
        sourceId: "1", title: "Nioh", release_date: "2017-02-07", creator: null,
        genres: [], platforms: [], description: null, image: null, ...over,
    });

    const settleSearch = async () => {
        await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    };

    const typeTitle = async (value: string) => {
        fireEvent.change(screen.getByLabelText("Title"), { target: { value } });
        await settleSearch();
    };

    it("moves the highlight with the arrow keys", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [candidate({ sourceId: "1", title: "Nioh" }), candidate({ sourceId: "2", title: "Nioh 2" })],
        });
        await showFolder([]);
        await typeTitle("nioh");

        const field = screen.getByLabelText("Title");
        const options = () => within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option");

        // Nothing is chosen until the keyboard says so, so Enter can still
        // record the title as typed.
        expect(options().every(o => o.getAttribute("aria-selected") === "false")).toBe(true);

        fireEvent.keyDown(field, { key: "ArrowDown" });
        expect(options()[0].getAttribute("aria-selected")).toBe("true");

        fireEvent.keyDown(field, { key: "ArrowDown" });
        expect(options()[1].getAttribute("aria-selected")).toBe("true");

        fireEvent.keyDown(field, { key: "ArrowUp" });
        expect(options()[0].getAttribute("aria-selected")).toBe("true");
    });

    it("captures the highlighted match on Enter", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [candidate({ sourceId: "1", title: "Nioh" }), candidate({ sourceId: "2", title: "Nioh 2" })],
        });
        await showFolder([]);
        await typeTitle("nioh");

        const field = screen.getByLabelText("Title");
        fireEvent.keyDown(field, { key: "ArrowDown" });
        fireEvent.keyDown(field, { key: "ArrowDown" });
        fireEvent.keyDown(field, { key: "Enter" });

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({ title: "Nioh 2" });
    });

    // The fast path for anything the provider does not know: type it, press
    // Enter, without arrowing into a list of things you did not mean.
    it("records the title as typed when nothing is highlighted", async () => {
        mocked.searchMetadata.mockResolvedValue({ results: [candidate({ title: "Nioh" })] });
        await showFolder([]);
        await typeTitle("Something Else");

        fireEvent.keyDown(screen.getByLabelText("Title"), { key: "Enter" });

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        expect(mocked.saveReview.mock.calls[0][0]).toMatchObject({ title: "Something Else" });
    });

    it("dismisses the matches on Escape", async () => {
        mocked.searchMetadata.mockResolvedValue({ results: [candidate()] });
        await showFolder([]);
        await typeTitle("nioh");

        fireEvent.keyDown(screen.getByLabelText("Title"), { key: "Escape" });

        expect(screen.queryByRole("listbox", { name: "Matches" })).toBeNull();
    });
});

// Story 3, at the moment it actually helps: a remake and its original share a
// title, so the list says which one you already have.
describe("spotting what is already captured", () => {
    const settleSearch = async () => {
        await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    };

    it("marks the match that is already in the collection", async () => {
        mocked.searchMetadata.mockResolvedValue({
            results: [
                { sourceId: "1", title: "Nioh 3", release_date: "2026-02-12", creator: null, genres: [], platforms: [], description: null, image: null },
                { sourceId: "2", title: "Onimusha", release_date: "2026-03-24", creator: null, genres: [], platforms: [], description: null, image: null },
            ],
        });
        await showFolder([review("Nioh 3", { status: "todo" })]);

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "ni" } });
        await settleSearch();

        const options = within(screen.getByRole("listbox", { name: "Matches" })).getAllByRole("option");
        expect(options[0].textContent).toContain("Captured");
        expect(options[1].textContent).not.toContain("Captured");
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
    // Every action moved into the editor: start/unstart/finish is its Status
    // field, delete is its type-the-slug confirm. The card carries no controls
    // of its own now — it is a display that opens the editor.
    it("carries no action controls on the card", async () => {
        await showFolder([review("Nioh 3", { status: "active" })]);

        const card = within(cardFor("Nioh 3"));
        expect(card.queryByLabelText("Start Nioh 3")).toBeNull();
        expect(card.queryByLabelText("Return Nioh 3 to queued")).toBeNull();
        expect(card.queryByLabelText("Edit Nioh 3")).toBeNull();
        expect(card.queryByLabelText("Remove Nioh 3")).toBeNull();
    });

    it("opens the editor when a card is clicked", async () => {
        await showFolder([review("Nioh 3", { status: "todo" })]);

        fireEvent.click(screen.getByLabelText("Open Nioh 3"));

        expect(await screen.findByDisplayValue("Nioh 3")).toBeDefined();
    });

    it("opens the editor on Enter", async () => {
        await showFolder([review("Nioh 3", { status: "todo" })]);

        fireEvent.keyDown(screen.getByLabelText("Open Nioh 3"), { key: "Enter" });

        expect(await screen.findByDisplayValue("Nioh 3")).toBeDefined();
    });
});

// A Category offers four sections and requires none of them (CONTEXT.md), so
// the card says which were written and never how many of four.
describe("what a card says about a Review", () => {
    const OLD_ID = "6955b900a1b2c3d4e5f60718";      // captured 2026-01-01
    const RECENT_ID = "6a63fc80a1b2c3d4e5f60718";   // captured 2026-07-25

    const card = (title: string) =>
        screen.getByText(title).closest("li") as HTMLElement;

    it("marks the sections that were written and draws nothing for the rest", async () => {
        await showFolder([
            review("Nioh 3", {
                type: "game",
                review: { story: "Good", sound: "Great", gameplay: "", graphics: "" },
            }),
        ]);

        const marks = screen.getByLabelText("Sections written");

        // story and sound, and no mark standing in for the two that aren't.
        expect(marks.textContent).toBe("✦♪");
    });

    it("never states a total, because four is not a target", async () => {
        await showFolder([
            review("Nioh 3", { type: "game", review: { story: "Good" } }),
        ]);

        expect(card("Nioh 3").textContent).not.toContain("/4");
        expect(card("Nioh 3").textContent).not.toContain("1 of 4");
    });

    it("says a Review with nothing written has nothing written", async () => {
        await showFolder([review("Nioh 3", { type: "game", review: {} })]);

        // Nothing written draws nothing at all on the card, rather than a
        // dash standing in for sections that were never a target.
        expect(screen.queryByLabelText("Sections written")).toBeNull();
    });

    it("says how long it has been waiting", async () => {
        await showFolder([review("Nioh 3", { _id: RECENT_ID })]);

        expect(card("Nioh 3").textContent).toContain("7d");
    });

    it("says nothing about waiting when the id carries no date", async () => {
        await showFolder([review("Nioh 3", { _id: "id-Nioh 3" })]);

        expect(card("Nioh 3").textContent).not.toContain("NaN");
        expect(within(card("Nioh 3")).queryByText(/waiting/i)).toBeNull();
    });

    it("leads with whatever has waited longest", async () => {
        await showFolder([
            review("Recent", { _id: RECENT_ID, status: "todo" }),
            review("Ancient", { _id: OLD_ID, status: "todo" }),
        ]);

        const position = screen.getByText("Ancient")
            .compareDocumentPosition(screen.getByText("Recent"));
        expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });
});

describe("the Backlog's state column", () => {
    // Scoped to the column: "Started" is also a section heading, and "game" is
    // also printed on every game card. A page-wide lookup would match those
    // instead, or match nothing because it matched several.
    const stat = (label: string) =>
        within(screen.getByLabelText("Backlog state")).getByText(label)
            .parentElement?.textContent;

    // The column stopped counting per Category and per Status when the rail
    // and the section heading started carrying those numbers. Repeating them
    // here is the duplication CONTEXT.md warns against, so these describe how
    // the list is behaving instead.
    it("counts what the controls are showing", async () => {
        await showFolder([
            review("A", { status: "active" }),
            review("B", { status: "todo" }),
            review("C", { status: "todo" }),
        ]);

        // One list now: the default view holds every unfinished item, started
        // and queued alike, so Showing counts all three.
        expect(stat("Showing")).toBe("Showing3");
    });

    // Status is a facet on the strip now, not a section boundary. Narrowing to
    // Started must leave only the active item, and the readout must agree.
    it("narrows to Started when the status facet asks for it", async () => {
        await showFolder([
            review("A", { status: "active" }),
            review("B", { status: "todo" }),
            review("C", { status: "todo" }),
        ]);

        openFilters();
        fireEvent.change(screen.getByLabelText("Status"), { target: { value: "active" } });

        expect(stat("Showing")).toBe("Showing1");
        expect(screen.getByText("A")).toBeDefined();
        expect(screen.queryByText("B")).toBeNull();
    });

    it("does not repeat the rail's per-Category counts", async () => {
        await showFolder([review("A", { status: "todo", type: "game" })]);

        const column = within(screen.getByLabelText("Backlog state"));
        expect(column.queryByText("game")).toBeNull();
        expect(column.queryByText("cinema")).toBeNull();
    });

    // The reference's self-diagnostic, and a real one: it reads NO ERROR
    // because it is capable of reading something else.
    it("reports itself healthy when nothing has gone wrong", async () => {
        await showFolder([review("A")]);

        expect(within(screen.getByLabelText("Backlog state")).getByText(/no error/i))
            .toBeDefined();
    });

    // Writes moved into the editor, so the one fault this surface can still see
    // is a collection that never loads. The diagnostic tracks that now.
    it("says so in the diagnostic when the collection fails to load", async () => {
        mocked.getReviews.mockRejectedValue(new Error("offline"));
        render(<BacklogWindow />);
        await waitFor(() => expect(mocked.getReviews).toHaveBeenCalled());
        await act(async () => {});

        const column = within(screen.getByLabelText("Backlog state"));
        await waitFor(() => expect(column.getByText(/^error$/i)).toBeDefined());
    });

    // The entrance is built against `[data-backlog-shelf] > li`. Wrapping the
    // cards in a div once made that selector match nothing, so the list stopped
    // animating in and nothing failed.
    it("keeps the cards as direct children of the shelf, for the entrance", async () => {
        await showFolder([review("A", { status: "todo" }), review("B", { status: "active" })]);

        const shelf = screen.getByRole("list", { name: "Backlog" });

        expect(shelf.getAttribute("data-backlog-shelf")).not.toBeNull();
        expect([...shelf.children].every(child => child.tagName === "LI")).toBe(true);
        expect(shelf.querySelectorAll(":scope > li").length).toBe(2);
    });

    // The rail is gone; Category is a facet on the strip now, each option
    // carrying the count choosing it would leave — including an empty one.
    it("offers each Category on the strip, counted", async () => {
        await showFolder([
            review("A", { type: "game", status: "todo" }),
            review("B", { type: "cinema", status: "active" }),
        ]);

        openFilters();
        const options = within(screen.getByLabelText("Category")).getAllByRole("option");
        const text = options.map(o => o.textContent);

        expect(text).toContain("game (1)");
        expect(text).toContain("cinema (1)");
        // A Category with nothing in it still holds its slot, saying zero.
        expect(text).toContain("book (0)");
    });
});

describe("grooming, continued", () => {
    // Story 16: the Reviews window shows finished work only now, so if the
    // heavier fields aren't reachable here they aren't reachable anywhere. The
    // whole card opens the editor — there is no separate Edit control.
    it("opens the full editor on a queued Review", async () => {
        await showFolder([review("Nioh 3", { status: "todo" })]);

        fireEvent.click(screen.getByLabelText("Open Nioh 3"));

        // The editor loads the Review it was handed.
        expect(await screen.findByDisplayValue("Nioh 3")).toBeDefined();
    });

    it("opens the full editor on a started Review too", async () => {
        await showFolder([review("Frieren", { status: "active" })]);

        fireEvent.click(screen.getByLabelText("Open Frieren"));

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

// §3: Started and Not Started are one list now, told apart by a glyph and
// ordered started-first by default.
describe("the unified list", () => {
    const OLD_ID = "6955b900a1b2c3d4e5f60718";      // captured 2026-01-01
    const RECENT_ID = "6a63fc80a1b2c3d4e5f60718";   // captured 2026-07-25

    it("shows the status as text on each card", async () => {
        await showFolder([
            review("Frieren", { status: "active" }),
            review("Nioh 3", { status: "todo" }),
        ]);

        // Status is shown, not controlled: a started card reads "Started", a
        // queued one "Queued". (The started border is a separate scan cue.)
        expect(within(cardFor("Frieren")).getByText("Started")).toBeDefined();
        expect(within(cardFor("Nioh 3")).getByText("Queued")).toBeDefined();
    });

    it("leads with what is started, even when a queued item has waited longer", async () => {
        await showFolder([
            review("Ancient Queue", { _id: OLD_ID, status: "todo" }),
            review("Fresh Start", { _id: RECENT_ID, status: "active" }),
        ]);

        // Started first despite the queued item being older — the default sort.
        const position = screen.getByText("Fresh Start")
            .compareDocumentPosition(screen.getByText("Ancient Queue"));
        expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
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

        render(<ReviewsWindow />);

        expect(await screen.findByText("Doom")).toBeDefined();
        expect(screen.queryByText("Nioh 3")).toBeNull();
        expect(screen.queryByText("Frieren")).toBeNull();
    });
});
