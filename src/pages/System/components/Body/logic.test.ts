import { describe, expect, it } from "vitest";
import { nextUp, prefill, sessionRows, valuesFromFields } from "./session";
import { addSlot, afterMove, removeSlot, replaceSlot, togglePair } from "./plan";
import { describeRoutineItem, describeSet, heading, signedLb } from "./text";
import { rollingAverage } from "./progress";
import type { LoggedSet, Movement, Session, Slot, Workout } from "../../../../types/body";

const reps = (id: string, over: Partial<Movement> = {}): Movement =>
    ({ _id: id, name: id, kind: "reps", rule: "pastFailure", sets: 2, loaded: false, ...over });

const movements: Movement[] = [
    reps("hold", { kind: "hold", rule: "noFailure", sets: 3 }),
    reps("push"),
    reps("pull"),
    reps("dip", { rule: "failure" }),
];

const workout: Workout = {
    key: "upperA", name: "Upper A", weekday: 1,
    slots: [
        { movementId: "hold", pair: null },
        { movementId: "push", pair: 1 },
        { movementId: "pull", pair: 1 },
        { movementId: "dip", pair: null },
    ],
};

const set = (movementId: string, n: number): LoggedSet => ({ id: `${movementId}${n}`, movementId, full: 5 });
const session = (sets: LoggedSet[], skipped: string[] = []): Session =>
    ({ _id: "s", date: "2026-11-09", workoutKey: "upperA", sets, skipped });

const up = (s: Session | null) => nextUp(sessionRows(workout, movements, s));

describe("nextUp (R20, R23)", () => {
    it("opens the first Movement when nothing is logged", () => {
        expect(up(null)).toEqual({ movementId: "hold", setNumber: 1 });
    });

    it("stays on a Movement until it has its Sets", () => {
        expect(up(session([set("hold", 1)]))).toEqual({ movementId: "hold", setNumber: 2 });
    });

    it("alternates the two Movements of a Pair", () => {
        const done = [set("hold", 1), set("hold", 2), set("hold", 3)];
        expect(up(session(done))).toEqual({ movementId: "push", setNumber: 1 });
        expect(up(session([...done, set("push", 1)]))).toEqual({ movementId: "pull", setNumber: 1 });
        expect(up(session([...done, set("push", 1), set("pull", 1)]))).toEqual({ movementId: "push", setNumber: 2 });
        expect(up(session([...done, set("push", 1), set("pull", 1), set("push", 2)]))).toEqual({ movementId: "pull", setNumber: 2 });
    });

    it("moves past a Pair once both Movements have their Sets", () => {
        const sets = [set("hold", 1), set("hold", 2), set("hold", 3), set("push", 1), set("pull", 1), set("push", 2), set("pull", 2)];
        expect(up(session(sets))).toEqual({ movementId: "dip", setNumber: 1 });
    });

    it("steps over a skipped Movement, and leaves its Pair partner alone", () => {
        expect(up(session([], ["hold"]))).toEqual({ movementId: "push", setNumber: 1 });
        expect(up(session([set("pull", 1)], ["hold", "push"]))).toEqual({ movementId: "pull", setNumber: 2 });
    });

    it("has nothing next when each Movement is done or skipped", () => {
        const sets = [set("hold", 1), set("hold", 2), set("hold", 3), set("push", 1), set("pull", 1), set("push", 2), set("pull", 2)];
        expect(up(session(sets, ["dip"]))).toBeNull();
    });
});

describe("sessionRows (R25)", () => {
    it("marks a Movement done at its set count, and a skipped one done", () => {
        const rows = sessionRows(workout, movements, session([set("push", 1), set("push", 2)], ["dip"]));
        expect(rows.map(r => [r.movement._id, r.sets.length, r.done, r.skipped])).toEqual([
            ["hold", 0, false, false],
            ["push", 2, true, false],
            ["pull", 0, false, false],
            ["dip", 0, true, true],
        ]);
    });

    it("leaves out a slot whose Movement is gone", () => {
        const broken = { ...workout, slots: [...workout.slots, { movementId: "ghost", pair: null }] };
        expect(sessionRows(broken, movements, null)).toHaveLength(4);
    });
});

describe("prefill (R22)", () => {
    const previous = { date: "2026-11-05", sets: [{ id: "a", movementId: "push", full: 9 }, { id: "b", movementId: "push", full: 7 }] };

    it("starts a Set's field with the same Set of the last Session", () => {
        expect(prefill(movements[1], previous, 1)).toBe("9");
        expect(prefill(movements[1], previous, 2)).toBe("7");
    });

    it("uses the last Set when the last Session had fewer", () => {
        expect(prefill(movements[1], previous, 3)).toBe("7");
    });

    it("uses seconds for a hold, and is empty with no last Session", () => {
        expect(prefill(movements[0], { date: "2026-11-05", sets: [{ id: "h", movementId: "hold", seconds: 25 }] }, 1)).toBe("25");
        expect(prefill(movements[1], undefined, 1)).toBe("");
    });
});

describe("valuesFromFields (R21)", () => {
    const blank = { full: "", partial: "", assisted: "", seconds: "", load: "" };

    it("reads three counts for a past-failure Movement, with blanks as zero", () => {
        expect(valuesFromFields(movements[1], { ...blank, full: "7", partial: "3" })).toEqual({ values: { full: 7, partial: 3, assisted: 0 } });
    });

    it("reads full reps alone for a Movement that is not past failure", () => {
        expect(valuesFromFields(movements[3], { ...blank, full: "9", partial: "4" })).toEqual({ values: { full: 9 } });
    });

    it("reads seconds for a hold", () => {
        expect(valuesFromFields(movements[0], { ...blank, seconds: "25" })).toEqual({ values: { seconds: 25 } });
    });

    it("reads a load on a loaded Movement only", () => {
        const shrug = reps("shrug", { loaded: true });
        expect(valuesFromFields(shrug, { ...blank, full: "12", load: "52.5" })).toEqual({ values: { full: 12, partial: 0, assisted: 0, load: 52.5 } });
        expect(valuesFromFields(movements[1], { ...blank, full: "12", load: "52.5" })).toEqual({ values: { full: 12, partial: 0, assisted: 0 } });
    });

    it("refuses a blank or a non-number", () => {
        expect(valuesFromFields(movements[1], blank).error).toBeTruthy();
        expect(valuesFromFields(movements[1], { ...blank, full: "seven" }).error).toBeTruthy();
        expect(valuesFromFields(movements[0], { ...blank, seconds: "0" }).error).toBeTruthy();
        expect(valuesFromFields(movements[1], { ...blank, full: "0" }).error).toBeTruthy();
    });
});

describe("Plan slots (R10)", () => {
    const slots: Slot[] = [
        { movementId: "a", pair: null },
        { movementId: "b", pair: 1 },
        { movementId: "c", pair: 1 },
        { movementId: "d", pair: null },
    ];

    it("pairs a Movement with the one below it", () => {
        expect(togglePair(slots, 0)).toEqual(slots);                       // b is already in a Pair
        const freed = togglePair(slots, 1);
        expect(freed.map(s => s.pair)).toEqual([null, null, null, null]);  // clears both halves
        expect(togglePair(freed, 2).map(s => s.pair)).toEqual([null, null, 1, 1]);
    });

    it("does not pair the last Movement", () => {
        expect(togglePair(slots, 3)).toEqual(slots);
    });

    it("numbers a new Pair above the ones that exist", () => {
        const two: Slot[] = [...slots, { movementId: "e", pair: null }];
        expect(togglePair(two, 3).map(s => s.pair)).toEqual([null, 1, 1, 2, 2]);
    });

    it("keeps a Pair that moves together and drops one that is split", () => {
        // d moves to the top: b and c stay neighbours.
        expect(afterMove(slots, 3, 0).map(s => [s.movementId, s.pair])).toEqual([["d", null], ["a", null], ["b", 1], ["c", 1]]);
        // a moves between b and c: the Pair is split.
        expect(afterMove(slots, 0, 1).map(s => [s.movementId, s.pair])).toEqual([["b", null], ["a", null], ["c", null], ["d", null]]);
    });

    it("clears the partner's Pair when a Movement is removed", () => {
        expect(removeSlot(slots, 1)).toEqual([
            { movementId: "a", pair: null }, { movementId: "c", pair: null }, { movementId: "d", pair: null },
        ]);
    });

    it("replaces a Movement in place and keeps its Pair", () => {
        expect(replaceSlot(slots, 1, "x")[1]).toEqual({ movementId: "x", pair: 1 });
    });

    it("adds a Movement at the end", () => {
        expect(addSlot(slots, "e")[4]).toEqual({ movementId: "e", pair: null });
    });
});

describe("text", () => {
    it("writes the heading from the weekday and the Workout (R13)", () => {
        expect(heading(1, "Upper A")).toBe("MONDAY — UPPER A");
        expect(heading(3, null)).toBe("WEDNESDAY — REST");
        expect(heading(7, null)).toBe("SUNDAY — REST");
    });

    it("describes a Set by what its Movement records", () => {
        expect(describeSet(movements[1], { id: "x", movementId: "push", full: 7, partial: 3, assisted: 2 })).toBe("7 full · 3 partial · 2 assisted");
        expect(describeSet(movements[3], { id: "x", movementId: "dip", full: 9 })).toBe("9 full");
        expect(describeSet(movements[0], { id: "x", movementId: "hold", seconds: 25 })).toBe("25 s");
        expect(describeSet(reps("shrug", { loaded: true }), { id: "x", movementId: "shrug", full: 12, partial: 0, assisted: 0, load: 70 }))
            .toBe("12 full · 0 partial · 0 assisted @ 70 lb");
    });

    it("describes a Routine item", () => {
        expect(describeRoutineItem({ name: "Pancake", sets: 2, seconds: 30 })).toBe("2 × 30 s");
        expect(describeRoutineItem({ name: "Wall angels", sets: 1, reps: 10 })).toBe("10 reps");
    });

    it("signs a change in pounds", () => {
        expect(signedLb(-3.5)).toBe("-3.5 lb");
        expect(signedLb(1)).toBe("+1.0 lb");
        expect(signedLb(0)).toBe("0.0 lb");
    });
});

describe("rollingAverage (R27)", () => {
    it("averages each Weigh-in with the ones of the 6 days before it", () => {
        const weighins = [
            { date: "2026-11-01", lb: 246 },
            { date: "2026-11-07", lb: 244 },   // 01 is 6 days back: (246 + 244) / 2
            { date: "2026-11-08", lb: 242 },   // 01 is 7 days back: (244 + 242) / 2
        ];
        expect(rollingAverage(weighins)).toEqual([
            { date: "2026-11-01", value: 246 },
            { date: "2026-11-07", value: 245 },
            { date: "2026-11-08", value: 243 },
        ]);
    });
});
