import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import BodyWindow from "./index";
import { backend } from "../../../../api/backend";
import type { LegacyDoc } from "./migration";

// The app's single boundary to the server — faking it here is what lets these
// tests drive the whole window as a user without knowing how it's built.
vi.mock("../../../../api/backend", () => ({
    backend: {
        getBodyEntries: vi.fn(),
        addBodyEntry: vi.fn(),
        updateBodyEntry: vi.fn(),
        removeBodyEntry: vi.fn(),
    },
}));

// chart.js needs a real canvas; jsdom has none. Nothing here asserts on the
// chart — the goal line is a visual decision, verified by eye.
vi.mock("react-chartjs-2", () => ({ Line: () => <div data-testid="chart" /> }));

const mocked = vi.mocked(backend);

const movement = (workoutName: string, over: Partial<LegacyDoc> = {}): LegacyDoc => ({
    _id: `m-${workoutName}`,
    workoutName,
    _meta: true,
    displayName: workoutName,
    tag: null,
    notes: "",
    order: 0,
    datetime: "2026-01-01T00:00:00.000Z",
    ...over,
});

const entry = (workoutName: string, datetime: string, over: Partial<LegacyDoc> = {}): LegacyDoc => ({
    _id: `e-${workoutName}-${datetime}`,
    workoutName,
    datetime,
    setsCompleted: 3,
    repsCompleted: 8,
    weightUsed: 180,
    ...over,
});

const renderBody = async (docs: LegacyDoc[]) => {
    mocked.getBodyEntries.mockResolvedValue(docs);
    const result = render(<BodyWindow onClose={() => {}} />);
    // Wait on something that only exists once the fetch has landed, otherwise
    // the list renders its empty state and the assertions race the data.
    if (docs.some(d => d._meta)) await screen.findByRole("region", { name: /log/i });
    else await screen.findByRole("list", { name: /movements/i });
    return result;
};

const list = () => screen.getByRole("list", { name: /movements/i });

beforeEach(() => {
    vi.stubEnv("VITE_DISABLE_ANIMATIONS", "true");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 6, 30, 9, 0, 0));
    mocked.addBodyEntry.mockResolvedValue({});
    mocked.updateBodyEntry.mockResolvedValue({});
    mocked.removeBodyEntry.mockResolvedValue({});
});

afterEach(() => {
    // vitest isn't configured with globals, so Testing Library's automatic
    // cleanup never registers — without this every render accumulates.
    cleanup();
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe("Movement list", () => {
    it("lists Movements from their own records", async () => {
        await renderBody([movement("Bench Press"), movement("Squat", { _id: "m-2", order: 1 })]);

        expect(within(list()).getByRole("button", { name: "Bench Press" })).toBeDefined();
        expect(within(list()).getByRole("button", { name: "Squat" })).toBeDefined();
    });

    it("lists a Movement that has no entries yet", async () => {
        await renderBody([movement("Calf Raise")]);

        expect(within(list()).getByRole("button", { name: "Calf Raise" })).toBeDefined();
    });

    it("does not list a movement that only appears on entries", async () => {
        await renderBody([movement("Bench Press"), entry("Ghost", "2026-03-01T00:00:00.000Z")]);

        expect(within(list()).queryByRole("button", { name: "Ghost" })).toBeNull();
    });

    it("orders Movements by their stored order", async () => {
        await renderBody([
            movement("Squat", { _id: "m-1", order: 2 }),
            movement("Bench Press", { _id: "m-2", order: 1 }),
        ]);

        const names = within(list())
            .getAllByRole("button", { name: /Squat|Bench Press/ })
            .map(b => b.textContent);
        expect(names).toEqual(["Bench Press", "Squat"]);
    });

    it("shows the Movement's display name rather than its stored name", async () => {
        await renderBody([movement("bench_press", { displayName: "Bench Press" })]);

        expect(within(list()).getByRole("button", { name: "Bench Press" })).toBeDefined();
    });

    it("filters by tag", async () => {
        await renderBody([
            movement("Bench Press", { _id: "m-1", tag: "upper" }),
            movement("Squat", { _id: "m-2", tag: "lower", order: 1 }),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /^lower$/i }));

        expect(within(list()).queryByRole("button", { name: "Bench Press" })).toBeNull();
        expect(within(list()).getByRole("button", { name: "Squat" })).toBeDefined();
    });
});

describe("Manage mode", () => {
    it("hides reorder and edit controls by default", async () => {
        await renderBody([movement("Bench Press")]);

        expect(screen.queryByRole("button", { name: /move bench press up/i })).toBeNull();
        expect(screen.queryByRole("button", { name: /edit bench press/i })).toBeNull();
    });

    it("reveals them when manage mode is entered, and hides them again on exit", async () => {
        await renderBody([movement("Bench Press"), movement("Squat", { _id: "m-2", order: 1 })]);

        fireEvent.click(screen.getByRole("button", { name: /manage/i }));
        expect(screen.getByRole("button", { name: /move squat up/i })).toBeDefined();
        expect(screen.getByRole("button", { name: /edit squat/i })).toBeDefined();

        fireEvent.click(screen.getByRole("button", { name: /done/i }));
        expect(screen.queryByRole("button", { name: /move squat up/i })).toBeNull();
    });

    it("persists a new order across every Movement when one is moved", async () => {
        await renderBody([
            movement("Bench Press", { _id: "m-1", order: 0 }),
            movement("Squat", { _id: "m-2", order: 1 }),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /manage/i }));
        fireEvent.click(screen.getByRole("button", { name: /move squat up/i }));

        await waitFor(() => expect(mocked.updateBodyEntry).toHaveBeenCalledTimes(2));
        expect(mocked.updateBodyEntry).toHaveBeenCalledWith({ id: "m-2", order: 0 });
        expect(mocked.updateBodyEntry).toHaveBeenCalledWith({ id: "m-1", order: 1 });
    });
});

describe("Logging a set", () => {
    it("writes today's date and the entered values", async () => {
        await renderBody([movement("Bench Press")]);

        fireEvent.change(screen.getByLabelText("Sets"), { target: { value: "4" } });
        fireEvent.change(screen.getByLabelText("Reps"), { target: { value: "6" } });
        fireEvent.change(screen.getByLabelText("Weight"), { target: { value: "195" } });
        fireEvent.click(screen.getByRole("button", { name: /^log$/i }));

        await waitFor(() => expect(mocked.addBodyEntry).toHaveBeenCalled());
        expect(mocked.addBodyEntry).toHaveBeenCalledWith({
            workoutName: "Bench Press",
            setsCompleted: 4,
            repsCompleted: 6,
            weightUsed: 195,
            datetime: new Date(2026, 6, 30).toISOString(),
        });
    });

    it("pre-fills the fields from the most recent entry for that Movement", async () => {
        await renderBody([
            movement("Bench Press"),
            entry("Bench Press", "2026-03-01T00:00:00.000Z", { setsCompleted: 5, repsCompleted: 5, weightUsed: 135 }),
            entry("Bench Press", "2026-07-01T00:00:00.000Z", { setsCompleted: 3, repsCompleted: 8, weightUsed: 185 }),
        ]);

        expect((screen.getByLabelText("Sets") as HTMLInputElement).value).toBe("3");
        expect((screen.getByLabelText("Reps") as HTMLInputElement).value).toBe("8");
        expect((screen.getByLabelText("Weight") as HTMLInputElement).value).toBe("185");
    });

    it("re-fetches so a freshly logged set shows up without a reload", async () => {
        await renderBody([movement("Bench Press")]);
        mocked.getBodyEntries.mockClear();

        fireEvent.change(screen.getByLabelText("Sets"), { target: { value: "3" } });
        fireEvent.click(screen.getByRole("button", { name: /^log$/i }));

        await waitFor(() => expect(mocked.getBodyEntries).toHaveBeenCalled());
    });

    it("backdates through the date control and then returns to today", async () => {
        await renderBody([movement("Bench Press")]);

        fireEvent.click(screen.getByRole("button", { name: /today/i }));
        fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-07-28" } });
        fireEvent.change(screen.getByLabelText("Sets"), { target: { value: "3" } });
        fireEvent.click(screen.getByRole("button", { name: /^log$/i }));

        await waitFor(() => expect(mocked.addBodyEntry).toHaveBeenCalled());
        expect(mocked.addBodyEntry).toHaveBeenCalledWith(
            expect.objectContaining({ datetime: new Date(2026, 6, 28).toISOString() })
        );

        await waitFor(() => expect(screen.getByRole("button", { name: /today/i })).toBeDefined());
    });

    it("refuses to log when no values were entered", async () => {
        await renderBody([movement("Bench Press")]);

        fireEvent.click(screen.getByRole("button", { name: /^log$/i }));

        expect(mocked.addBodyEntry).not.toHaveBeenCalled();
    });
});

describe("Goal", () => {
    it("shows the selected Movement's goal alongside the log fields", async () => {
        await renderBody([movement("Bench Press", { goal: { sets: 3, reps: 8, weight: 185 } })]);

        const bar = screen.getByRole("region", { name: /log/i });
        expect(within(bar).getByText(/3/)).toBeDefined();
        expect(within(bar).getByText(/185/)).toBeDefined();
    });

    it("says so when a Movement has no goal", async () => {
        await renderBody([movement("Bench Press")]);

        const bar = screen.getByRole("region", { name: /log/i });
        expect(within(bar).getByText(/no goal/i)).toBeDefined();
    });

    it("is saved onto the Movement record, replacing the previous one", async () => {
        await renderBody([movement("Bench Press", { goal: { sets: 3, reps: 8, weight: 185 } })]);

        fireEvent.click(screen.getByRole("button", { name: /manage/i }));
        fireEvent.click(screen.getByRole("button", { name: /edit bench press/i }));
        fireEvent.change(screen.getByLabelText(/weight goal/i), { target: { value: "205" } });
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

        await waitFor(() => expect(mocked.updateBodyEntry).toHaveBeenCalled());
        expect(mocked.updateBodyEntry).toHaveBeenCalledWith(
            expect.objectContaining({ id: "m-Bench Press", goal: { sets: 3, reps: 8, weight: 205 } })
        );
    });
});

describe("Notes", () => {
    it("shows the Movement's notes next to the log fields", async () => {
        await renderBody([movement("Bench Press", { notes: "elbows tucked, pause at chest" })]);

        expect(screen.getByText(/elbows tucked, pause at chest/i)).toBeDefined();
    });
});

describe("Tabs", () => {
    it("shows the chart first", async () => {
        await renderBody([movement("Bench Press")]);

        expect(screen.getByTestId("chart")).toBeDefined();
    });

    it("has no Notes tab", async () => {
        await renderBody([movement("Bench Press")]);

        expect(screen.queryByRole("button", { name: /^notes$/i })).toBeNull();
    });
});

describe("History", () => {
    it("lists the selected Movement's logged sets", async () => {
        await renderBody([
            movement("Bench Press"),
            entry("Bench Press", "2026-07-01T00:00:00.000Z", { setsCompleted: 3, repsCompleted: 8, weightUsed: 185 }),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /^history$/i }));
        const history = screen.getByRole("region", { name: /history/i });
        expect(within(history).getByText(/3 sets/i)).toBeDefined();
        expect(within(history).getByText(/185 lbs/i)).toBeDefined();
    });

    it("shows only the selected Movement's sets", async () => {
        await renderBody([
            movement("Bench Press", { _id: "m-1" }),
            movement("Squat", { _id: "m-2", order: 1 }),
            entry("Squat", "2026-07-01T00:00:00.000Z", { setsCompleted: 9, repsCompleted: 9, weightUsed: 225 }),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /^history$/i }));
        const history = screen.getByRole("region", { name: /history/i });
        expect(within(history).queryByText(/225 lbs/i)).toBeNull();
    });

    it("edits a logged set", async () => {
        await renderBody([
            movement("Bench Press"),
            entry("Bench Press", "2026-07-01T00:00:00.000Z"),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /^history$/i }));
        const history = screen.getByRole("region", { name: /history/i });
        fireEvent.click(within(history).getAllByRole("button")[0]);

        const dialog = screen.getByRole("dialog", { name: /edit entry/i });
        fireEvent.change(within(dialog).getByLabelText("Weight"), { target: { value: "190" } });
        fireEvent.click(within(dialog).getByRole("button", { name: /^save$/i }));

        await waitFor(() => expect(mocked.updateBodyEntry).toHaveBeenCalled());
        expect(mocked.updateBodyEntry).toHaveBeenCalledWith(
            expect.objectContaining({ id: "e-Bench Press-2026-07-01T00:00:00.000Z", weightUsed: 190 })
        );
    });

    it("deletes a logged set", async () => {
        await renderBody([
            movement("Bench Press"),
            entry("Bench Press", "2026-07-01T00:00:00.000Z"),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /^history$/i }));
        const history = screen.getByRole("region", { name: /history/i });
        fireEvent.click(within(history).getAllByRole("button")[0]);
        fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

        await waitFor(() => expect(mocked.removeBodyEntry).toHaveBeenCalledWith("e-Bench Press-2026-07-01T00:00:00.000Z"));
    });
});

describe("Creating a Movement", () => {
    it("writes exactly one record", async () => {
        await renderBody([]);

        fireEvent.click(screen.getByRole("button", { name: /new/i }));
        fireEvent.change(screen.getByLabelText(/movement name/i), { target: { value: "Pull-ups" } });
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

        await waitFor(() => expect(mocked.addBodyEntry).toHaveBeenCalledTimes(1));
        expect(mocked.addBodyEntry).toHaveBeenCalledWith(
            expect.objectContaining({ workoutName: "Pull-ups", _meta: true, displayName: "Pull-ups" })
        );
    });
});

describe("Deleting", () => {
    it("removes a Movement and all of its entries when explicitly deleted", async () => {
        await renderBody([
            movement("Bench Press"),
            entry("Bench Press", "2026-07-01T00:00:00.000Z"),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /manage/i }));
        fireEvent.click(screen.getByRole("button", { name: /edit bench press/i }));
        fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
        fireEvent.change(screen.getByLabelText(/type the name/i), { target: { value: "Bench Press" } });
        fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

        await waitFor(() => expect(mocked.removeBodyEntry).toHaveBeenCalledWith("m-Bench Press"));
        expect(mocked.removeBodyEntry).toHaveBeenCalledWith("e-Bench Press-2026-07-01T00:00:00.000Z");
    });
});
