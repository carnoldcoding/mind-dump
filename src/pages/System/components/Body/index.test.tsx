import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import BodyWindow from "./index";
import { backend } from "../../../../api/backend";
import type { BodyData, BodySummary, LoggedSet, Session } from "../../../../types/body";

// The app's one boundary to the server; faking it lets these tests drive the
// window as a user would. What is due, the grid and the averages are the
// backend's, and are tested there — here the summary is given, and the
// question is whether the window shows it and sends the right requests.
vi.mock("../../../../api/backend", () => ({
    backend: {
        getBody: vi.fn(),
        addBodyMovement: vi.fn(),
        updateBodyMovement: vi.fn(),
        removeBodyMovement: vi.fn(),
        updateBodyWorkout: vi.fn(),
        updateBodyRoutine: vi.fn(),
        updateBodyPhase: vi.fn(),
        startBodySession: vi.fn(),
        removeBodySession: vi.fn(),
        addBodySet: vi.fn(),
        updateBodySet: vi.fn(),
        removeBodySet: vi.fn(),
        skipBodyMovement: vi.fn(),
        checkBodyRoutine: vi.fn(),
        setBodyWeighIn: vi.fn(),
        removeBodyWeighIn: vi.fn(),
    },
}));

// chart.js needs a real canvas; jsdom has none. How a chart looks is checked
// by eye.
vi.mock("react-chartjs-2", () => ({
    Line: () => <div data-testid="chart" />,
}));

const mocked = vi.mocked(backend);

// 2026-11-09 is a Monday.
const TODAY = "2026-11-09";

const summary = (over: Partial<BodySummary> = {}): BodySummary => ({
    today: { date: TODAY, weekday: 1, due: "upperA", dueDone: false, missed: [] },
    grid: [{
        weekStart: TODAY,
        workouts: [
            { key: "upperA", name: "Upper A", weekday: 1, done: false, date: null },
            { key: "lowerA", name: "Lower A", weekday: 2, done: false, date: null },
            { key: "upperB", name: "Upper B", weekday: 4, done: false, date: null },
            { key: "lowerB", name: "Lower B", weekday: 5, done: false, date: null },
        ],
        routine: ["09", "10", "11", "12", "13", "14", "15"].map(d => ({ date: `2026-11-${d}`, done: false })),
    }],
    weight: { latest: null, average: null, count: 0, startLb: 245, targetLb: 216, change: null },
    bests: {},
    previous: { push: { date: "2026-11-05", sets: [{ id: "p1", movementId: "push", full: 9, partial: 2, assisted: 0 }] } },
    ...over,
});

const sample = (over: Partial<BodyData> = {}): BodyData => ({
    today: TODAY,
    plan: {
        workouts: [
            {
                key: "upperA", name: "Upper A", weekday: 1,
                slots: [
                    { movementId: "hold", pair: null },
                    { movementId: "push", pair: 1 },
                    { movementId: "pull", pair: 1 },
                    { movementId: "dip", pair: null },
                ],
            },
            { key: "lowerA", name: "Lower A", weekday: 2, slots: [{ movementId: "squat", pair: null }] },
            { key: "upperB", name: "Upper B", weekday: 4, slots: [] },
            { key: "lowerB", name: "Lower B", weekday: 5, slots: [] },
        ],
        routine: { items: [{ name: "Pancake", sets: 2, seconds: 30 }, { name: "Wall angels", sets: 1, reps: 10 }] },
        phase: { name: "Phase 1", startLb: 245, targetLb: 216 },
    },
    movements: [
        { _id: "hold", name: "Handstand hold", kind: "hold", rule: "noFailure", sets: 2, loaded: false },
        { _id: "push", name: "Deep push-up", kind: "reps", rule: "pastFailure", sets: 2, loaded: false },
        { _id: "pull", name: "Pull-up", kind: "reps", rule: "pastFailure", sets: 2, loaded: false },
        { _id: "dip", name: "Dip", kind: "reps", rule: "failure", sets: 2, loaded: false },
        { _id: "squat", name: "Squat", kind: "reps", rule: "pastFailure", sets: 2, loaded: false },
        { _id: "spare", name: "Spare", kind: "reps", rule: "failure", sets: 2, loaded: false },
    ],
    sessions: [],
    checks: [],
    weighins: [],
    summary: summary(),
    ...over,
});

const holdSets: LoggedSet[] = [{ id: "h1", movementId: "hold", seconds: 20 }, { id: "h2", movementId: "hold", seconds: 22 }];
const reps = (movementId: string, n: number): LoggedSet => ({ id: `${movementId}${n}`, movementId, full: 6, partial: 1, assisted: 0 });
const session = (sets: LoggedSet[], over: Partial<Session> = {}): Session =>
    ({ _id: "sess1", date: TODAY, workoutKey: "upperA", sets, skipped: [], ...over });

const renderWindow = async (data = sample()) => {
    mocked.getBody.mockResolvedValue(data);
    render(<BodyWindow />);
    if (data.plan) await screen.findByTestId("today-heading");
};

const row = (name: string) => screen.getByTestId(`movement-${name}`);
const type = (scope: HTMLElement, label: string, value: string) =>
    fireEvent.change(within(scope).getByLabelText(label), { target: { value } });

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 9, 9, 30));
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe("loading", () => {
    // The server runs in UTC; the browser's date decides which day it is.
    it("asks for the data as of the browser's date", async () => {
        await renderWindow();
        expect(mocked.getBody).toHaveBeenCalledWith(TODAY);
    });

    it("says that the seed has not run when there is no Plan", async () => {
        await renderWindow(sample({ plan: null, summary: null }));
        expect(await screen.findByText(/No Plan yet/)).toBeTruthy();
    });
});

describe("Today (R12–R18)", () => {
    it("opens on Today, with the weekday and the Workout in the heading", async () => {
        await renderWindow();
        expect(screen.getByTestId("today-heading").textContent).toBe("MONDAY — UPPER A");
        expect(screen.getByTestId("summary-training").textContent).toBe("0 / 4");
    });

    it("shows REST on a day with no Workout", async () => {
        await renderWindow(sample({ summary: summary({ today: { date: TODAY, weekday: 3, due: null, dueDone: false, missed: [] } }) }));
        expect(screen.getByTestId("today-heading").textContent).toBe("WEDNESDAY — REST");
        expect(screen.getByTestId("summary-training").textContent).toBe("—");
        // A rest day with nothing missed is the status bar alone (body-ui R17).
        expect(screen.queryByText("Session")).toBeNull();
    });

    it("checks the Routine on its status row, and clears the check (body-ui R6)", async () => {
        await renderWindow();
        mocked.checkBodyRoutine.mockResolvedValue({});
        expect(screen.getByTestId("summary-routine").textContent).toBe("◇");
        fireEvent.click(screen.getByRole("button", { name: "Mark routine done" }));
        await waitFor(() => expect(mocked.checkBodyRoutine).toHaveBeenCalledWith(TODAY, true));
        await waitFor(() => expect(mocked.getBody).toHaveBeenCalledTimes(2));

        cleanup();
        await renderWindow(sample({ checks: [{ date: TODAY }] }));
        expect(screen.getByTestId("summary-routine").textContent).toBe("◆");
        fireEvent.click(screen.getByRole("button", { name: "Mark routine not done" }));
        await waitFor(() => expect(mocked.checkBodyRoutine).toHaveBeenCalledWith(TODAY, false));
    });

    it("keeps a Routine that is done to one row, with its list closed (body-ui R7)", async () => {
        await renderWindow(sample({ checks: [{ date: TODAY }] }));
        expect(screen.queryByTestId("routine-items")).toBeNull();
        expect(screen.queryByText("Pancake")).toBeNull();
        expect(within(screen.getByTestId("routine-row")).getByText("2 items")).toBeTruthy();
    });

    it("opens the Routine list from its name, and closes it again (body-ui R6)", async () => {
        await renderWindow();
        expect(screen.queryByText("Pancake")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Routine" }));
        expect(within(screen.getByTestId("routine-items")).getByText("Pancake")).toBeTruthy();
        expect(within(screen.getByTestId("routine-items")).getByText("2 × 30 s")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Routine" }));
        expect(screen.queryByTestId("routine-items")).toBeNull();
    });

    it("has no Morning routine section and no Bodyweight section (body-ui R4)", async () => {
        await renderWindow();
        expect(screen.queryByText("Morning routine")).toBeNull();
        expect(screen.queryByText("Bodyweight")).toBeNull();
    });

    it("shows no chip row when no other Workout can be opened (body-ui R11)", async () => {
        await renderWindow();
        expect(screen.queryByTestId("other-upperA")).toBeNull();
    });

    it("offers a missed Workout as a chip, and starts it on today's date (body-plan R15, body-ui R11)", async () => {
        await renderWindow(sample({ summary: summary({ today: { date: TODAY, weekday: 3, due: null, dueDone: false, missed: ["upperA"] } }) }));
        mocked.startBodySession.mockResolvedValue(session([]));
        mocked.addBodySet.mockResolvedValue(session([]));
        const chip = screen.getByTestId("other-upperA");
        expect(chip.textContent).toBe("◇ Upper A");
        expect(chip.getAttribute("aria-pressed")).toBe("false");
        fireEvent.click(chip);
        expect(screen.getByTestId("other-upperA").getAttribute("aria-pressed")).toBe("true");
        type(row("Handstand hold"), "Seconds", "20");
        fireEvent.click(within(row("Handstand hold")).getByRole("button", { name: "Save set 1" }));
        await waitFor(() => expect(mocked.startBodySession).toHaveBeenCalledWith(TODAY, "upperA"));
    });

    it("switches between the Workout due and a missed one (body-ui R11)", async () => {
        await renderWindow(sample({ summary: summary({ today: { date: TODAY, weekday: 1, due: "upperA", dueDone: false, missed: ["lowerA"] } }) }));
        expect(screen.getByTestId("other-upperA").getAttribute("aria-pressed")).toBe("true");
        expect(screen.queryByTestId("movement-Squat")).toBeNull();
        fireEvent.click(screen.getByTestId("other-lowerA"));
        expect(screen.getByTestId("movement-Squat")).toBeTruthy();
        expect(screen.queryByTestId("movement-Dip")).toBeNull();
    });

    it("saves one Weigh-in for today from the Weight row (body-ui R9)", async () => {
        await renderWindow();
        mocked.setBodyWeighIn.mockResolvedValue({});
        fireEvent.change(screen.getByLabelText("Weight lb"), { target: { value: "241.5" } });
        fireEvent.click(screen.getByRole("button", { name: "Save weigh-in" }));
        await waitFor(() => expect(mocked.setBodyWeighIn).toHaveBeenCalledWith(TODAY, 241.5));
    });

    it("shows today's Weigh-in as a value, and opens the field again on a press (body-ui R9)", async () => {
        const weight = { latest: { date: TODAY, lb: 240 }, average: 242.1, count: 7, startLb: 245, targetLb: 216, change: -2.9 };
        await renderWindow(sample({ weighins: [{ date: TODAY, lb: 240 }], summary: summary({ weight }) }));
        expect(screen.queryByLabelText("Weight lb")).toBeNull();
        expect(screen.getByTestId("weight-today").textContent).toBe("240.0 lb");
        fireEvent.click(screen.getByTestId("weight-today"));
        expect((screen.getByLabelText("Weight lb") as HTMLInputElement).value).toBe("240");
    });

    it("shows the 7-day average and the change from the start, and not the start or the target (body-ui R10)", async () => {
        const weight = { latest: { date: TODAY, lb: 240 }, average: 242.1, count: 7, startLb: 245, targetLb: 216, change: -2.9 };
        await renderWindow(sample({ weighins: [{ date: TODAY, lb: 240 }], summary: summary({ weight }) }));
        expect(screen.getByTestId("weight-average").textContent).toBe("242.1");
        expect(screen.getByTestId("weight-change").textContent).toBe("-2.9 lb");
        expect(screen.queryByTestId("weight-start")).toBeNull();
        expect(screen.queryByTestId("weight-target")).toBeNull();
    });
});

describe("Session (R19–R25)", () => {
    it("lists the Movements in Plan order with the first one open", async () => {
        await renderWindow();
        const names = screen.getAllByTestId(/^movement-/).map(el => el.getAttribute("data-testid"));
        expect(names).toEqual(["movement-Handstand hold", "movement-Deep push-up", "movement-Pull-up", "movement-Dip"]);
        expect(row("Handstand hold").getAttribute("data-open")).toBe("true");
        expect(row("Deep push-up").getAttribute("data-open")).toBe("false");
    });

    it("logs a hold in seconds, and creates the Session with its first Set", async () => {
        await renderWindow();
        mocked.startBodySession.mockResolvedValue(session([]));
        mocked.addBodySet.mockResolvedValue(session([]));
        const hold = row("Handstand hold");
        expect(within(hold).queryByLabelText("Full")).toBeNull();
        type(hold, "Seconds", "25");
        fireEvent.click(within(hold).getByRole("button", { name: "Save set 1" }));
        await waitFor(() => expect(mocked.addBodySet).toHaveBeenCalledWith("sess1", "hold", { seconds: 25 }));
        expect(mocked.startBodySession).toHaveBeenCalledWith(TODAY, "upperA");
        await waitFor(() => expect(mocked.getBody).toHaveBeenCalledTimes(2));
    });

    it("shows three fields past failure, with the last Session beside them and its full reps filled in", async () => {
        await renderWindow(sample({ sessions: [session(holdSets)] }));
        mocked.addBodySet.mockResolvedValue(session([]));
        const push = row("Deep push-up");
        expect(push.getAttribute("data-open")).toBe("true");
        expect(within(push).getByTestId("last").textContent).toBe("Last Nov 59·2·0");
        expect((within(push).getByLabelText("Full") as HTMLInputElement).value).toBe("9");
        type(push, "Partial", "3");
        fireEvent.click(within(push).getByRole("button", { name: "Save set 1" }));
        await waitFor(() => expect(mocked.addBodySet).toHaveBeenCalledWith("sess1", "push", { full: 9, partial: 3, assisted: 0 }));
        // The Session exists already, so it is not started again.
        expect(mocked.startBodySession).not.toHaveBeenCalled();
    });

    it("moves to the other Movement of a Pair after each Set", async () => {
        await renderWindow(sample({ sessions: [session([...holdSets, reps("push", 1)])] }));
        expect(row("Pull-up").getAttribute("data-open")).toBe("true");
        expect(within(row("Pull-up")).getByRole("button", { name: "Save set 1" })).toBeTruthy();

        cleanup();
        await renderWindow(sample({ sessions: [session([...holdSets, reps("push", 1), reps("pull", 1)])] }));
        expect(row("Deep push-up").getAttribute("data-open")).toBe("true");
        expect(within(row("Deep push-up")).getByRole("button", { name: "Save set 2" })).toBeTruthy();
    });

    it("shows one field for a Movement that stops at failure", async () => {
        const sets = [...holdSets, reps("push", 1), reps("pull", 1), reps("push", 2), reps("pull", 2)];
        await renderWindow(sample({ sessions: [session(sets)] }));
        const dip = row("Dip");
        expect(dip.getAttribute("data-open")).toBe("true");
        expect(within(dip).getByLabelText("Full")).toBeTruthy();
        expect(within(dip).queryByLabelText("Partial")).toBeNull();
        expect(screen.getByTestId("summary-training").textContent).toBe("3 / 4");
        expect(screen.queryByText(/movements done/)).toBeNull();
    });

    it("refuses a Set with no number, and sends nothing", async () => {
        await renderWindow();
        fireEvent.click(within(row("Handstand hold")).getByRole("button", { name: "Save set 1" }));
        expect(await screen.findByText("Enter the seconds")).toBeTruthy();
        expect(mocked.addBodySet).not.toHaveBeenCalled();
    });

    it("skips a Movement, and shows it as skipped", async () => {
        await renderWindow();
        mocked.startBodySession.mockResolvedValue(session([]));
        mocked.skipBodyMovement.mockResolvedValue(session([]));
        fireEvent.click(within(row("Handstand hold")).getByRole("button", { name: "Skip" }));
        await waitFor(() => expect(mocked.skipBodyMovement).toHaveBeenCalledWith("sess1", "hold", true));

        cleanup();
        await renderWindow(sample({ sessions: [session([], { skipped: ["hold"] })] }));
        expect(within(row("Handstand hold")).getByTestId("state").textContent).toBe("⊘");
        expect(within(row("Handstand hold")).getByTestId("mark").textContent).toBe("⊘");
        expect(row("Deep push-up").getAttribute("data-open")).toBe("true");
    });

    it("removes a skip with the same glyph (body-ui R16)", async () => {
        await renderWindow(sample({ sessions: [session([], { skipped: ["hold"] })] }));
        mocked.skipBodyMovement.mockResolvedValue(session([]));
        fireEvent.click(within(row("Handstand hold")).getByRole("button", { expanded: false }));
        fireEvent.click(within(row("Handstand hold")).getByRole("button", { name: "Undo skip" }));
        await waitFor(() => expect(mocked.skipBodyMovement).toHaveBeenCalledWith("sess1", "hold", false));
    });

    it("offers Skip only before the first Set (body-ui R16)", async () => {
        await renderWindow(sample({ sessions: [session([holdSets[0]])] }));
        expect(row("Handstand hold").getAttribute("data-open")).toBe("true");
        expect(within(row("Handstand hold")).queryByRole("button", { name: "Skip" })).toBeNull();
    });

    it("draws a Movement's state and its Sets as glyphs (body-ui R12, R13)", async () => {
        await renderWindow(sample({ sessions: [session([...holdSets, reps("push", 1)])] }));
        // Done: both Sets filled.
        expect(within(row("Handstand hold")).getByTestId("mark").textContent).toBe("◆");
        expect(within(row("Handstand hold")).getByTestId("state").textContent).toBe("◆◆");
        // Started, and not the open one.
        expect(within(row("Deep push-up")).getByTestId("mark").textContent).toBe("◈");
        expect(within(row("Deep push-up")).getByTestId("state").textContent).toBe("◆◇");
        // The open row carries the caret.
        expect(within(row("Pull-up")).getByTestId("mark").textContent).toBe("➤");
        expect(within(row("Pull-up")).getByTestId("state").textContent).toBe("◇◇");
        expect(within(row("Dip")).getByTestId("mark").textContent).toBe("◇");
        // The Rule is a glyph that carries its name.
        expect(within(row("Pull-up")).getByLabelText("Past failure").textContent).toBe("▲▲");
        expect(within(row("Dip")).getByLabelText("Failure only").textContent).toBe("▲");
        expect(within(row("Handstand hold")).getByLabelText("No failure").textContent).toBe("△");
    });

    it("saves the open Set with the Enter key (body-ui R15)", async () => {
        await renderWindow(sample({ sessions: [session([])] }));
        mocked.addBodySet.mockResolvedValue(session([]));
        const hold = row("Handstand hold");
        type(hold, "Seconds", "31");
        fireEvent.submit(within(hold).getByLabelText("Seconds").closest("form")!);
        await waitFor(() => expect(mocked.addBodySet).toHaveBeenCalledWith("sess1", "hold", { seconds: 31 }));
    });

    it("shows the server's reason when a Set is refused", async () => {
        await renderWindow(sample({ sessions: [session([])] }));
        mocked.addBodySet.mockRejectedValue(new Error("POST /api/body/sessions/add_set failed (400): seconds must be a whole number from 1 to 3600"));
        type(row("Handstand hold"), "Seconds", "9999");
        fireEvent.click(within(row("Handstand hold")).getByRole("button", { name: "Save set 1" }));
        expect(await screen.findByText("Seconds must be a whole number from 1 to 3600")).toBeTruthy();
    });
});

describe("Progress (R26–R29)", () => {
    const done = () => {
        const s = summary();
        s.grid[0].workouts[0] = { ...s.grid[0].workouts[0], done: true, date: TODAY };
        s.grid[0].routine[0] = { date: TODAY, done: true };
        s.bests = { push: { best: { date: TODAY, value: 6 }, series: [{ date: TODAY, value: 6 }] } };
        return sample({ sessions: [session([reps("push", 1)])], weighins: [{ date: TODAY, lb: 244 }], summary: s });
    };
    const open = async () => {
        await renderWindow(done());
        fireEvent.click(screen.getByRole("button", { name: "Progress" }));
        await screen.findByTestId(`grid-${TODAY}-upperA`);
    };

    it("marks each Workout and each Routine day done or not done, with no streak count", async () => {
        await open();
        expect(screen.getByTestId(`grid-${TODAY}-upperA`).getAttribute("data-done")).toBe("true");
        expect(screen.getByTestId(`grid-${TODAY}-lowerA`).getAttribute("data-done")).toBe("false");
        expect(screen.getByTestId(`grid-${TODAY}`).getAttribute("data-done")).toBe("true");
        expect(screen.getByTestId("grid-2026-11-10").getAttribute("data-done")).toBe("false");
        expect(screen.queryByText(/streak/i)).toBeNull();
    });

    it("lists the past Sets of a Movement, and edits one", async () => {
        await open();
        mocked.updateBodySet.mockResolvedValue(session([]));
        fireEvent.click(within(screen.getByTestId("past-sets")).getByRole("button", { name: "Set 1: 6·1·0" }));
        const dialog = await screen.findByRole("dialog");
        type(dialog, "Full", "8");
        fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => expect(mocked.updateBodySet).toHaveBeenCalledWith("sess1", "push1", { full: 8, partial: 1, assisted: 0 }));
    });

    it("deletes a past Set", async () => {
        await open();
        mocked.removeBodySet.mockResolvedValue(session([]));
        fireEvent.click(within(screen.getByTestId("past-sets")).getByRole("button", { name: /^Set 1/ }));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete set" }));
        await waitFor(() => expect(mocked.removeBodySet).toHaveBeenCalledWith("sess1", "push1"));
    });

    it("removes a Weigh-in", async () => {
        await open();
        mocked.removeBodyWeighIn.mockResolvedValue({});
        const remove = within(screen.getByTestId(`weighin-${TODAY}`)).getByRole("button", { name: "Remove the weigh-in of Nov 9" });
        expect(remove.textContent).toBe("×");
        fireEvent.click(remove);
        await waitFor(() => expect(mocked.removeBodyWeighIn).toHaveBeenCalledWith(TODAY));
    });

    it("draws the grid cells as glyphs (body-ui R23)", async () => {
        await open();
        expect(screen.getByTestId(`grid-${TODAY}-upperA`).textContent).toBe("◆");
        expect(screen.getByTestId(`grid-${TODAY}-lowerA`).textContent).toBe("◇");
    });

    it("shows the start, the target, the average and the change on one line (body-ui R24)", async () => {
        const data = done();
        data.summary!.weight = { latest: { date: TODAY, lb: 244 }, average: 244.5, count: 2, startLb: 245, targetLb: 216, change: -0.5 };
        await renderWindow(data);
        fireEvent.click(screen.getByRole("button", { name: "Progress" }));
        expect((await screen.findByTestId("weight-start")).textContent).toBe("245.0");
        expect(screen.getByTestId("weight-target").textContent).toBe("216.0");
        expect(screen.getByTestId("weight-average").textContent).toBe("244.5");
        expect(screen.getByTestId("weight-change").textContent).toBe("-0.5 lb");
    });
});

describe("Plan (R10, R11)", () => {
    const open = async () => {
        await renderWindow();
        fireEvent.click(screen.getByRole("button", { name: "Plan" }));
        await screen.findByTestId("workout-upperA");
    };

    const show = (id: string) => fireEvent.click(screen.getByTestId(`plan-${id}`));

    it("shows one list at a time, and opens on the Workout that is due next (body-ui R18)", async () => {
        await open();
        expect(screen.getByTestId("plan-upperA").getAttribute("aria-pressed")).toBe("true");
        expect(screen.queryByTestId("workout-lowerA")).toBeNull();
        expect(screen.queryByTestId("plan-list-routine")).toBeNull();
        expect(screen.queryByTestId("plan-list-phase")).toBeNull();

        show("lowerA");
        expect(screen.getByTestId("workout-lowerA")).toBeTruthy();
        expect(screen.queryByTestId("workout-upperA")).toBeNull();

        show("routine");
        expect(within(screen.getByTestId("plan-list-routine")).getByText("Pancake")).toBeTruthy();
        expect(screen.queryByTestId("workout-lowerA")).toBeNull();

        show("phase");
        expect(screen.getByTestId("plan-list-phase")).toBeTruthy();
        expect(screen.queryByTestId("plan-list-routine")).toBeNull();
    });

    it("opens on the next Workout when today's is done (body-ui R18)", async () => {
        await renderWindow(sample({ summary: summary({ today: { date: TODAY, weekday: 1, due: "upperA", dueDone: true, missed: [] } }) }));
        fireEvent.click(screen.getByRole("button", { name: "Plan" }));
        expect((await screen.findByTestId("plan-lowerA")).getAttribute("aria-pressed")).toBe("true");
    });

    it("offers Unused only when a Movement is in no Workout (body-ui R19)", async () => {
        await open();
        expect(screen.getByTestId("plan-unused")).toBeTruthy();

        cleanup();
        const data = sample();
        data.movements = data.movements.filter(m => m._id !== "spare");
        await renderWindow(data);
        fireEvent.click(screen.getByRole("button", { name: "Plan" }));
        await screen.findByTestId("plan-upperA");
        expect(screen.queryByTestId("plan-unused")).toBeNull();
    });

    it("shows a Movement's Sets and Rule as a glyph, and a Pair as one bracket (body-ui R21)", async () => {
        await open();
        expect(within(screen.getByTestId("slot-Deep push-up")).getByText("2 × ▲▲")).toBeTruthy();
        expect(within(screen.getByTestId("slot-Handstand hold")).getByText("2 × △")).toBeTruthy();
        expect(screen.getByTestId("slot-Deep push-up").getAttribute("data-pair")).toBe("first");
        expect(screen.getByTestId("slot-Pull-up").getAttribute("data-pair")).toBe("second");
        expect(screen.getByTestId("slot-Dip").getAttribute("data-pair")).toBeNull();
    });

    it("moves a Workout to another weekday", async () => {
        await open();
        show("upperB");
        mocked.updateBodyWorkout.mockResolvedValue({});
        fireEvent.change(screen.getByLabelText("Upper B weekday"), { target: { value: "3" } });
        await waitFor(() => expect(mocked.updateBodyWorkout).toHaveBeenCalledWith("upperB", { weekday: 3 }));
    });

    it("replaces a Movement in a Workout and keeps its Pair", async () => {
        await open();
        mocked.updateBodyWorkout.mockResolvedValue({});
        fireEvent.click(within(screen.getByTestId("workout-upperA")).getByTestId("slot-Deep push-up"));
        const dialog = await screen.findByRole("dialog");
        fireEvent.change(within(dialog).getByLabelText("Replace with"), { target: { value: "spare" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Replace" }));
        await waitFor(() => expect(mocked.updateBodyWorkout).toHaveBeenCalledWith("upperA", { slots: [
            { movementId: "hold", pair: null },
            { movementId: "spare", pair: 1 },
            { movementId: "pull", pair: 1 },
            { movementId: "dip", pair: null },
        ] }));
    });

    it("removes a Movement from a Workout and clears its partner's Pair", async () => {
        await open();
        mocked.updateBodyWorkout.mockResolvedValue({});
        fireEvent.click(within(screen.getByTestId("workout-upperA")).getByTestId("slot-Deep push-up"));
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Remove from Upper A" }));
        await waitFor(() => expect(mocked.updateBodyWorkout).toHaveBeenCalledWith("upperA", { slots: [
            { movementId: "hold", pair: null },
            { movementId: "pull", pair: null },
            { movementId: "dip", pair: null },
        ] }));
    });

    it("changes a Movement's Rule and set count", async () => {
        await open();
        mocked.updateBodyMovement.mockResolvedValue({} as never);
        fireEvent.click(within(screen.getByTestId("workout-upperA")).getByTestId("slot-Dip"));
        const dialog = await screen.findByRole("dialog");
        fireEvent.change(within(dialog).getByLabelText("Sets"), { target: { value: "3" } });
        fireEvent.change(within(dialog).getByLabelText("Rule"), { target: { value: "pastFailure" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => expect(mocked.updateBodyMovement).toHaveBeenCalledWith("dip", {
            name: "Dip", kind: "reps", rule: "pastFailure", sets: 3, loaded: false,
        }));
    });

    it("adds an existing Movement to a Workout", async () => {
        await open();
        mocked.updateBodyWorkout.mockResolvedValue({});
        show("upperB");
        const add = within(screen.getByTestId("workout-upperB")).getByRole("button", { name: "Add movement" });
        expect(add.textContent).toBe("＋");
        fireEvent.click(add);
        const dialog = await screen.findByRole("dialog");
        fireEvent.change(within(dialog).getByLabelText("Existing movement"), { target: { value: "spare" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
        await waitFor(() => expect(mocked.updateBodyWorkout).toHaveBeenCalledWith("upperB", { slots: [{ movementId: "spare", pair: null }] }));
    });

    it("shows the server's reason when a Movement with Sets cannot be deleted (D15)", async () => {
        await open();
        mocked.removeBodyMovement.mockRejectedValue(new Error("POST /api/body/movements/remove failed (409): This Movement has logged Sets and cannot be deleted"));
        show("unused");
        fireEvent.click(within(screen.getByTestId("unused-Spare")).getByRole("button", { name: "Delete Spare" }));
        expect(await screen.findByText("This Movement has logged Sets and cannot be deleted")).toBeTruthy();
    });

    it("saves the Phase target", async () => {
        await open();
        mocked.updateBodyPhase.mockResolvedValue({});
        show("phase");
        fireEvent.change(screen.getByLabelText("Target lb"), { target: { value: "209" } });
        fireEvent.click(screen.getByRole("button", { name: "Save phase" }));
        await waitFor(() => expect(mocked.updateBodyPhase).toHaveBeenCalledWith({ name: "Phase 1", startLb: 245, targetLb: 209 }));
    });
});
