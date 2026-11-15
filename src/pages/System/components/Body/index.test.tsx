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
    previous: { push: { date: "2026-11-05", sets: [{ id: "p1", movementId: "push", full: 9 }, { id: "p2", movementId: "push", full: 7 }] } },
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
const reps = (movementId: string, n: number): LoggedSet => ({ id: `${movementId}${n}`, movementId, full: 6 });
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

// A day whose Weigh-in and Stretches are done, so the Session is what is left.
const training = (over: Partial<BodyData> = {}): BodyData =>
    sample({ checks: [{ date: TODAY }], weighins: [{ date: TODAY, lb: 240 }], ...over });

const hint = () => screen.getByTestId("today-hint").textContent;
const mark = (testId: string) => within(screen.getByTestId(testId)).getByTestId("mark").textContent;
const pane = () => screen.getByTestId("today-pane");
const list = () => screen.getByTestId("today-list");
const selected = () => screen.getAllByTestId(/^(row|movement)-/).filter(el => el.getAttribute("data-selected") === "true").map(el => el.getAttribute("data-testid"));
const number = (label: string) => within(pane()).getByLabelText(label) as HTMLInputElement;
const press = (name: string) => fireEvent.click(within(pane()).getByRole("button", { name }));

/** A device with a mouse, where the field takes the keyboard (body-flow R19). */
const withMouse = () => vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(pointer: fine)" }));

describe("Today: the frame (body-today R1–R5, body-flow R1, R5)", () => {
    it("names the weekday and the Workout in the header band", async () => {
        await renderWindow();
        expect(screen.getByTestId("today-title").textContent).toBe("Monday");
        expect(screen.getByTestId("today-aside").textContent).toBe("Upper A");
    });

    it("shows Rest on a day with no Workout, with two rows", async () => {
        await renderWindow(sample({ summary: summary({ today: { date: TODAY, weekday: 3, due: null, dueDone: false, missed: [] } }) }));
        expect(screen.getByTestId("today-title").textContent).toBe("Wednesday");
        expect(screen.getByTestId("today-aside").textContent).toBe("Rest");
        expect(screen.getByTestId("row-weight")).toBeTruthy();
        expect(screen.getByTestId("row-stretches")).toBeTruthy();
        expect(screen.queryAllByTestId(/^movement-/)).toHaveLength(0);
    });

    it("lists the day in order: Weight, Stretches, then the Movements in Plan order", async () => {
        await renderWindow();
        const ids = within(list()).getAllByTestId(/^(row|movement)-/).map(el => el.getAttribute("data-testid"));
        expect(ids).toEqual(["row-weight", "row-stretches", "movement-Handstand hold", "movement-Deep push-up", "movement-Pull-up", "movement-Dip"]);
    });

    it("shows each row's value: the weight, the count of stretches, a glyph for each Set", async () => {
        await renderWindow();
        expect(within(screen.getByTestId("row-weight")).getByTestId("state").textContent).toBe("—");
        expect(within(screen.getByTestId("row-stretches")).getByTestId("state").textContent).toBe("2");
        expect(within(row("Dip")).getByTestId("state").textContent).toBe("◇◇");

        cleanup();
        await renderWindow(training());
        expect(within(screen.getByTestId("row-weight")).getByTestId("state").textContent).toBe("240.0 lb");
    });

    it("keeps each field out of the list: the pane holds them (body-flow R5, R7)", async () => {
        await renderWindow(training());
        expect(within(list()).queryAllByRole("textbox")).toHaveLength(0);
        expect(within(list()).queryByRole("button", { name: /Save/ })).toBeNull();
        expect(within(pane()).getByLabelText("Seconds")).toBeTruthy();
    });

    it("never says Routine (R23)", async () => {
        await renderWindow();
        expect(screen.queryByText(/routine/i)).toBeNull();
    });
});

describe("Today: the selection (body-flow R19–R23)", () => {
    it("selects the Weigh-in on a new day, and shows it in the pane", async () => {
        await renderWindow();
        expect(selected()).toEqual(["row-weight"]);
        expect(mark("row-weight")).toBe("➤");
        expect(within(pane()).getByTestId("pane-title").textContent).toBe("Weight");
        expect(hint()).toBe("Records the bodyweight of today.");
        // The pane shows the selected row and no other.
        expect(screen.queryByTestId("stretch-items")).toBeNull();
        expect(screen.queryByLabelText("Seconds")).toBeNull();
    });

    it("gives the field the keyboard where there is a mouse, and not on a phone (R19)", async () => {
        await renderWindow();
        expect(document.activeElement).not.toBe(number("Weight lb"));

        cleanup();
        withMouse();
        await renderWindow();
        expect(document.activeElement).toBe(number("Weight lb"));
        vi.unstubAllGlobals();
    });

    it("selects the Stretches once the Weigh-in is in", async () => {
        await renderWindow(sample({ weighins: [{ date: TODAY, lb: 240 }] }));
        expect(mark("row-weight")).toBe("◆");
        expect(selected()).toEqual(["row-stretches"]);
        expect(within(screen.getByTestId("stretch-items")).getByText("Pancake")).toBeTruthy();
        expect(within(screen.getByTestId("stretch-items")).getByText("2 × 30 s")).toBeTruthy();
        expect(hint()).toBe("Marks the morning stretches done.");
    });

    it("selects the first Movement once the Weigh-in and the Stretches are done", async () => {
        await renderWindow(training());
        expect(mark("row-stretches")).toBe("◆");
        expect(selected()).toEqual(["movement-Handstand hold"]);
        expect(within(pane()).getByTestId("pane-title").textContent).toBe("Handstand hold");
        expect(within(pane()).getByTestId("pane-at").textContent).toBe("Set 1 / 2");
        expect(hint()).toBe("Logs set 1 of Handstand hold.");
    });

    it("selects nothing when the day is complete, and says so in the pane and the hint bar (R18)", async () => {
        const sets = [...holdSets, reps("push", 1), reps("pull", 1), reps("push", 2), reps("pull", 2), reps("dip", 1), reps("dip", 2)];
        await renderWindow(training({ sessions: [session(sets)] }));
        expect(selected()).toEqual([]);
        expect(screen.getByTestId("today-complete").textContent).toBe("◆Complete");
        expect(hint()).toBe("The day is complete.");
    });

    it("selects another row on a press; a press on the selected row changes nothing (R23)", async () => {
        await renderWindow(training());
        fireEvent.click(screen.getByTestId("row-weight"));
        expect(selected()).toEqual(["row-weight"]);
        expect(number("Weight lb").value).toBe("240");
        expect(hint()).toBe("Replaces the bodyweight of today.");

        fireEvent.click(screen.getByTestId("row-weight"));
        expect(selected()).toEqual(["row-weight"]);
    });

    it("stays on the Movement after a Set when the Stretches are not done (the reported bug, R21, R22)", async () => {
        const data = sample({ weighins: [{ date: TODAY, lb: 240 }] });
        await renderWindow(data);
        expect(selected()).toEqual(["row-stretches"]);
        fireEvent.click(row("Dip"));

        mocked.startBodySession.mockResolvedValue(session([]));
        mocked.addBodySet.mockResolvedValue(session([]));
        mocked.getBody.mockResolvedValue({ ...data, sessions: [session([reps("dip", 1)])] });
        fireEvent.change(number("Reps"), { target: { value: "6" } });
        press("Save set 1");
        await waitFor(() => expect(within(pane()).getByTestId("pane-at").textContent).toBe("Set 2 / 2"));
        expect(selected()).toEqual(["movement-Dip"]);
        expect(mark("row-stretches")).toBe("◇");
    });

    it("goes on to the next row below after the last Set, then back up to a row passed over (R21)", async () => {
        const done = [...holdSets, reps("push", 1), reps("pull", 1), reps("push", 2), reps("pull", 2)];
        const data = sample({ weighins: [{ date: TODAY, lb: 240 }], sessions: [session([reps("hold", 1)])] });
        await renderWindow(data);
        fireEvent.click(row("Handstand hold"));

        mocked.addBodySet.mockResolvedValue(session([]));
        mocked.getBody.mockResolvedValue({ ...data, sessions: [session(holdSets)] });
        fireEvent.change(number("Seconds"), { target: { value: "22" } });
        press("Save set 2");
        await waitFor(() => expect(selected()).toEqual(["movement-Deep push-up"]));

        // The last Set of the Session: nothing below is open, so the Stretches above are next.
        cleanup();
        const last = sample({ weighins: [{ date: TODAY, lb: 240 }], sessions: [session([...done, reps("dip", 1)])] });
        await renderWindow(last);
        fireEvent.click(row("Dip"));
        mocked.getBody.mockResolvedValue({ ...last, sessions: [session([...done, reps("dip", 1), reps("dip", 2)])] });
        fireEvent.change(number("Reps"), { target: { value: "6" } });
        press("Save set 2");
        await waitFor(() => expect(selected()).toEqual(["row-stretches"]));
    });

    it("moves from the Weigh-in to the next row that is not done after a save", async () => {
        mocked.setBodyWeighIn.mockResolvedValue({});
        await renderWindow(training());
        fireEvent.click(screen.getByTestId("row-weight"));
        fireEvent.change(number("Weight lb"), { target: { value: "239" } });
        press("Save weigh-in");
        await waitFor(() => expect(mocked.setBodyWeighIn).toHaveBeenCalledWith(TODAY, 239));
        await waitFor(() => expect(selected()).toEqual(["movement-Handstand hold"]));
    });
});

describe("Today: the Session is not a choice (body-today R17–R19)", () => {
    it("offers no missed Workout and no control that changes the Workout", async () => {
        await renderWindow(sample({ summary: summary({ today: { date: TODAY, weekday: 6, due: null, dueDone: false, missed: ["upperA", "lowerA", "upperB", "lowerB"] } }) }));
        expect(screen.getByTestId("today-aside").textContent).toBe("Rest");
        expect(screen.queryAllByTestId(/^movement-/)).toHaveLength(0);
        expect(screen.queryByText("Upper A")).toBeNull();
        expect(screen.queryByText("Lower B")).toBeNull();
        expect(screen.queryByTestId("other-upperA")).toBeNull();
    });

    it("shows only the Workout due when another is missed", async () => {
        await renderWindow(sample({ summary: summary({ today: { date: TODAY, weekday: 1, due: "upperA", dueDone: false, missed: ["lowerA"] } }) }));
        expect(screen.getByTestId("movement-Dip")).toBeTruthy();
        expect(screen.queryByTestId("movement-Squat")).toBeNull();
        expect(screen.queryByText("Lower A")).toBeNull();
    });
});

describe("Today: Weight and Stretches (body-flow R16, R17)", () => {
    it("saves one Weigh-in for today, with the Enter key", async () => {
        await renderWindow();
        // The control that saves is a check mark, never the caret of the selected row.
        expect(within(pane()).getByRole("button", { name: "Save weigh-in" }).textContent).toBe("✓");
        expect(mark("row-weight")).toBe("➤");
        mocked.setBodyWeighIn.mockResolvedValue({});
        fireEvent.change(number("Weight lb"), { target: { value: "241.5" } });
        fireEvent.submit(number("Weight lb").closest("form")!);
        await waitFor(() => expect(mocked.setBodyWeighIn).toHaveBeenCalledWith(TODAY, 241.5));
        await waitFor(() => expect(mocked.getBody).toHaveBeenCalledTimes(2));
    });

    it("dims the save control while the field is empty, and shows the last Weigh-in as the placeholder", async () => {
        const weight = { latest: { date: "2026-11-08", lb: 240.4 }, average: 242.1, count: 7, startLb: 245, targetLb: 216, change: -2.9 };
        await renderWindow(sample({ summary: summary({ weight }) }));
        expect((within(pane()).getByRole("button", { name: "Save weigh-in" }) as HTMLButtonElement).disabled).toBe(true);
        expect(number("Weight lb").value).toBe("");
        expect(number("Weight lb").placeholder).toBe("240.4");
    });

    it("refuses a Weigh-in that is not a number, in the hint bar (R22)", async () => {
        await renderWindow();
        fireEvent.change(number("Weight lb"), { target: { value: "heavy" } });
        fireEvent.submit(number("Weight lb").closest("form")!);
        expect(hint()).toBe("Enter your weight in pounds");
        expect(mocked.setBodyWeighIn).not.toHaveBeenCalled();
    });

    it("shows the 7-day average and the change with the Weight row only (D6)", async () => {
        const weight = { latest: { date: TODAY, lb: 240 }, average: 242.1, count: 7, startLb: 245, targetLb: 216, change: -2.9 };
        await renderWindow(training({ summary: summary({ weight }) }));
        expect(screen.queryByTestId("weight-average")).toBeNull();
        fireEvent.click(screen.getByTestId("row-weight"));
        expect(screen.getByTestId("weight-average").textContent).toBe("242.1");
        expect(screen.getByTestId("weight-change").textContent).toBe("-2.9 lb");
        expect(screen.queryByTestId("weight-start")).toBeNull();
    });

    it("marks the Stretches done for the date, and clears the mark", async () => {
        await renderWindow(sample({ weighins: [{ date: TODAY, lb: 240 }] }));
        mocked.checkBodyRoutine.mockResolvedValue({});
        expect(within(pane()).getByRole("button", { name: "Mark stretches done" }).textContent).toBe("✓");
        press("Mark stretches done");
        await waitFor(() => expect(mocked.checkBodyRoutine).toHaveBeenCalledWith(TODAY, true));

        cleanup();
        await renderWindow(training());
        fireEvent.click(screen.getByTestId("row-stretches"));
        expect(hint()).toBe("Clears the mark on the morning stretches.");
        expect(within(pane()).getByRole("button", { name: "Clear the stretches mark" }).textContent).toBe("×");
        press("Clear the stretches mark");
        await waitFor(() => expect(mocked.checkBodyRoutine).toHaveBeenCalledWith(TODAY, false));
    });
});

describe("Today: the Session (body-plan R19–R25, body-flow R8–R15)", () => {
    it("logs a hold in seconds, and creates the Session with its first Set", async () => {
        await renderWindow(training());
        mocked.startBodySession.mockResolvedValue(session([]));
        mocked.addBodySet.mockResolvedValue(session([]));
        expect(within(pane()).queryByLabelText("Reps")).toBeNull();
        fireEvent.change(number("Seconds"), { target: { value: "25" } });
        expect(within(pane()).getByRole("button", { name: "Save set 1" }).textContent).toBe("✓");
        press("Save set 1");
        await waitFor(() => expect(mocked.addBodySet).toHaveBeenCalledWith("sess1", "hold", { seconds: 25 }));
        expect(mocked.startBodySession).toHaveBeenCalledWith(TODAY, "upperA");
        await waitFor(() => expect(mocked.getBody).toHaveBeenCalledTimes(2));
    });

    it("shows the Rule in words and the last Session, and repeats the last Session with one press (R8, R10)", async () => {
        await renderWindow(training({ sessions: [session(holdSets)] }));
        mocked.addBodySet.mockResolvedValue(session([]));
        expect(selected()).toEqual(["movement-Deep push-up"]);
        expect(within(pane()).getByTestId("pane-rule").textContent).toBe("▲▲Past failure");
        expect(within(pane()).getByTestId("last").textContent).toBe("Last Nov 59 / 7");
        expect(number("Reps").value).toBe("9");
        // Reps after failure are not counted, so they are not fields.
        expect(within(pane()).queryByLabelText("Partial")).toBeNull();
        expect(within(pane()).queryByLabelText("Assisted")).toBeNull();
        press("Save set 1");
        await waitFor(() => expect(mocked.addBodySet).toHaveBeenCalledWith("sess1", "push", { full: 9 }));
        // The Session exists already, so it is not started again.
        expect(mocked.startBodySession).not.toHaveBeenCalled();
    });

    it("changes reps by 1 with − and +, and saves the result (R9, R11)", async () => {
        await renderWindow(training({ sessions: [session(holdSets)] }));
        mocked.addBodySet.mockResolvedValue(session([]));
        expect(within(pane()).getByRole("button", { name: "One rep less" }).textContent).toBe("−");
        expect(within(pane()).getByRole("button", { name: "One rep more" }).textContent).toBe("+");
        press("One rep more");
        press("One rep more");
        expect(number("Reps").value).toBe("11");
        press("One rep less");
        expect(number("Reps").value).toBe("10");
        press("Save set 1");
        await waitFor(() => expect(mocked.addBodySet).toHaveBeenCalledWith("sess1", "push", { full: 10 }));
    });

    it("changes seconds by 5, starts an empty number from 0, and stops at 1 (R10, R11)", async () => {
        await renderWindow(training());
        expect(number("Seconds").value).toBe("");
        press("5 seconds less");
        expect(number("Seconds").value).toBe("");
        press("5 seconds more");
        expect(number("Seconds").value).toBe("5");
        press("5 seconds more");
        expect(number("Seconds").value).toBe("10");
        press("5 seconds less");
        press("5 seconds less");
        expect(number("Seconds").value).toBe("1");
    });

    it("dims the save control while the number is empty (R14)", async () => {
        await renderWindow(training());
        expect((within(pane()).getByRole("button", { name: "Save set 1" }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.change(number("Seconds"), { target: { value: "20" } });
        expect((within(pane()).getByRole("button", { name: "Save set 1" }) as HTMLButtonElement).disabled).toBe(false);
    });

    it("moves to the other Movement of a Pair after each Set", async () => {
        await renderWindow(training({ sessions: [session([...holdSets, reps("push", 1)])] }));
        expect(selected()).toEqual(["movement-Pull-up"]);
        expect(hint()).toBe("Logs set 1 of Pull-up.");

        cleanup();
        await renderWindow(training({ sessions: [session([...holdSets, reps("push", 1), reps("pull", 1)])] }));
        expect(selected()).toEqual(["movement-Deep push-up"]);
        expect(within(pane()).getByRole("button", { name: "Save set 2" })).toBeTruthy();
    });

    it("does not show the Sets logged today; the row's glyphs count them (D5)", async () => {
        await renderWindow(training({ sessions: [session([...holdSets, reps("push", 1), reps("pull", 1)])] }));
        expect(selected()).toEqual(["movement-Deep push-up"]);
        expect(within(row("Deep push-up")).getByTestId("state").textContent).toBe("◆◇");
        expect(within(pane()).queryByText(/^Set 1/)).toBeNull();
        expect(within(pane()).queryByText("6")).toBeNull();
    });

    it("refuses a Set that is not a whole number in the hint bar, and sends nothing (R22)", async () => {
        await renderWindow(training());
        fireEvent.change(number("Seconds"), { target: { value: "1.5" } });
        press("Save set 1");
        expect(hint()).toBe("Enter the seconds");
        expect(mocked.addBodySet).not.toHaveBeenCalled();
    });

    it("shows the server's reason in the hint bar when a Set is refused (R22)", async () => {
        await renderWindow(training({ sessions: [session([])] }));
        mocked.addBodySet.mockRejectedValue(new Error("POST /api/body/sessions/add_set failed (400): seconds must be a whole number from 1 to 3600"));
        fireEvent.change(number("Seconds"), { target: { value: "9999" } });
        press("Save set 1");
        await waitFor(() => expect(hint()).toBe("Seconds must be a whole number from 1 to 3600"));
    });

    it("skips a Movement, shows it as skipped, and returns it with the same glyph (R15)", async () => {
        await renderWindow(training());
        mocked.startBodySession.mockResolvedValue(session([]));
        mocked.skipBodyMovement.mockResolvedValue(session([]));
        press("Skip");
        await waitFor(() => expect(mocked.skipBodyMovement).toHaveBeenCalledWith("sess1", "hold", true));

        cleanup();
        vi.clearAllMocks();
        mocked.skipBodyMovement.mockResolvedValue(session([]));
        await renderWindow(training({ sessions: [session([], { skipped: ["hold"] })] }));
        expect(within(row("Handstand hold")).getByTestId("state").textContent).toBe("⊘");
        expect(mark("movement-Handstand hold")).toBe("⊘");
        expect(selected()).toEqual(["movement-Deep push-up"]);
        fireEvent.click(row("Handstand hold"));
        expect(hint()).toBe("Returns Handstand hold to the Session.");
        press("Undo skip");
        await waitFor(() => expect(mocked.skipBodyMovement).toHaveBeenCalledWith("sess1", "hold", false));
    });

    it("offers Skip only before the first Set", async () => {
        await renderWindow(training({ sessions: [session([holdSets[0]])] }));
        expect(selected()).toEqual(["movement-Handstand hold"]);
        expect(within(pane()).queryByRole("button", { name: "Skip" })).toBeNull();
    });

    it("draws a Movement's state, its Rule and its Sets as glyphs", async () => {
        await renderWindow(training({ sessions: [session([...holdSets, reps("push", 1)])] }));
        expect(mark("movement-Handstand hold")).toBe("◆");
        expect(within(row("Handstand hold")).getByTestId("state").textContent).toBe("◆◆");
        expect(mark("movement-Deep push-up")).toBe("◈");
        expect(within(row("Deep push-up")).getByTestId("state").textContent).toBe("◆◇");
        // The selected row carries the caret.
        expect(mark("movement-Pull-up")).toBe("➤");
        expect(mark("movement-Dip")).toBe("◇");
        expect(within(row("Pull-up")).getByLabelText("Past failure").textContent).toBe("▲▲");
        expect(within(row("Dip")).getByLabelText("Failure only").textContent).toBe("▲");
        expect(within(row("Handstand hold")).getByLabelText("No failure").textContent).toBe("△");
    });

    it("saves the Set with the Enter key (R14)", async () => {
        await renderWindow(training({ sessions: [session([])] }));
        mocked.addBodySet.mockResolvedValue(session([]));
        fireEvent.change(number("Seconds"), { target: { value: "31" } });
        fireEvent.submit(number("Seconds").closest("form")!);
        await waitFor(() => expect(mocked.addBodySet).toHaveBeenCalledWith("sess1", "hold", { seconds: 31 }));
    });

    it("shows a second field for the load of a loaded Movement (R13)", async () => {
        const data = training({ sessions: [session(holdSets)] });
        data.movements = data.movements.map(m => (m._id === "push" ? { ...m, loaded: true } : m));
        await renderWindow(data);
        mocked.addBodySet.mockResolvedValue(session([]));
        fireEvent.change(within(pane()).getByLabelText("Load lb"), { target: { value: "35" } });
        press("Save set 1");
        await waitFor(() => expect(mocked.addBodySet).toHaveBeenCalledWith("sess1", "push", { full: 9, load: 35 }));
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
        fireEvent.click(within(screen.getByTestId("past-sets")).getByRole("button", { name: "Set 1: 6" }));
        const dialog = await screen.findByRole("dialog");
        type(dialog, "Reps", "8");
        fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await waitFor(() => expect(mocked.updateBodySet).toHaveBeenCalledWith("sess1", "push1", { full: 8 }));
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
        expect(screen.getByTestId("plan-routine").textContent).toBe("Stretches");
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
        expect(add.textContent).toBe("+");
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
