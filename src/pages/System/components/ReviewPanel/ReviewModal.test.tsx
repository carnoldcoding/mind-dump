import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import { ReviewModal } from "./ReviewModal";
import { makeReview } from "../../../../test/reviews";
import { backend } from "../../../../api/backend";

vi.mock("../../../../api/backend", () => ({
    backend: {
        getCreators: vi.fn(),
        getReviews: vi.fn(),
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

// The editor is a heavy form, and the bug was silent data loss: it read "Saved"
// while typing, but closing by a path other than the × threw away everything
// typed since the last autosave. The fix routes every close path through the
// flush, so this asserts the behaviour rather than the wiring — type, close,
// and the newest value reaches saveReview.
const openEditor = async (stored?: Record<string, unknown>) => {
    mocked.getCreators.mockResolvedValue([]);
    mocked.getReviews.mockResolvedValue(stored ? [stored] : []);
    mocked.getAudioTracks.mockResolvedValue([]);
    mocked.getImages.mockResolvedValue([]);
    mocked.saveReview.mockResolvedValue({ id: "id-Nioh" });

    const result = render(
        <ReviewModal
            isOpen
            setIsOpen={() => {}}
            onReviewAdded={() => {}}
            editingReview={makeReview("Nioh", { type: "game", status: "active", slug: "nioh" })}
        />,
    );
    // The load effect fetches this Review's media on open.
    await waitFor(() => expect(mocked.getImages).toHaveBeenCalled());
    await act(async () => {});
    return result;
};

describe("ReviewModal close flush", () => {
    beforeEach(() => {
        vi.stubEnv("VITE_DISABLE_ANIMATIONS", "true");
        vi.clearAllMocks();
        cleanup();
    });

    it("saves the latest edit when closed by Escape, not only by the × button", async () => {
        await openEditor();

        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Nioh Remastered" },
        });
        await act(async () => {});

        // Close before the 2.5s autosave could fire on its own — the flush on
        // close is what must persist the edit.
        fireEvent.keyDown(window, { key: "Escape" });
        await act(async () => {});

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        const [payload, isUpdate] = mocked.saveReview.mock.calls.at(-1)!;
        expect(payload).toMatchObject({ title: "Nioh Remastered" });
        // An existing Review is an update, not a fresh insert.
        expect(isUpdate).toBe(true);
    });
});

// The collection the editor opens from is fetched once per page session, so a
// tab left open while the Review was written on another device holds an old
// copy. Opening it used to autosave that copy over the stored one.
describe("ReviewModal stale copy", () => {
    beforeEach(() => {
        vi.stubEnv("VITE_DISABLE_ANIMATIONS", "true");
        vi.clearAllMocks();
        cleanup();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    it("does not save when opened and left untouched", async () => {
        await openEditor();
        await act(async () => { vi.advanceTimersByTime(5000); });

        expect(mocked.saveReview).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it("edits the stored record, not the collection's older copy", async () => {
        await openEditor(makeReview("Nioh", {
            type: "game", status: "active", slug: "nioh",
            review: { story: "Written on another device." },
        }));

        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Nioh Remastered" },
        });
        await act(async () => { vi.advanceTimersByTime(3000); });

        await waitFor(() => expect(mocked.saveReview).toHaveBeenCalled());
        const [payload] = mocked.saveReview.mock.calls.at(-1)!;
        expect(payload).toMatchObject({
            title: "Nioh Remastered",
            review: { story: "Written on another device." },
        });
        vi.useRealTimers();
    });
});
