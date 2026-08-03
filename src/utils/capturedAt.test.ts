import { describe, expect, it } from "vitest";
import { capturedAt, daysWaiting } from "./capturedAt";

// The hex prefixes below are real timestamps: 0x69fd2780 is 2026-05-08 and
// 0x696ad100 is 2026-01-17, both midnight UTC. The remaining 16 characters of
// an ObjectId are machine and counter bytes, which this never reads.
const SILENT_HILL = "69fd2780a1b2c3d4e5f60718";
const FRIEREN = "696ad100a1b2c3d4e5f60718";

describe("when a Review was captured", () => {
    it("reads the timestamp Mongo put in the front of the id", () => {
        expect(capturedAt(SILENT_HILL)?.toISOString()).toBe("2026-05-08T00:00:00.000Z");
        expect(capturedAt(FRIEREN)?.toISOString()).toBe("2026-01-17T00:00:00.000Z");
    });

    // The Backlog is the only caller and it renders whatever comes back, so an
    // id that isn't one has to be absence rather than an Invalid Date — which
    // would reach the screen as the literal text "NaN".
    it("says nothing rather than guessing at an id it cannot read", () => {
        expect(capturedAt("")).toBeUndefined();
        expect(capturedAt("not-an-object-id")).toBeUndefined();
        expect(capturedAt("short")).toBeUndefined();
        // Test fixtures across this suite use ids like `id-Nioh`.
        expect(capturedAt("id-Nioh")).toBeUndefined();
    });
});

describe("how long something has been waiting", () => {
    const now = new Date("2026-08-03T00:00:00.000Z");

    it("counts whole days since it was captured", () => {
        expect(daysWaiting(SILENT_HILL, now)).toBe(87);
        expect(daysWaiting(FRIEREN, now)).toBe(198);
    });

    it("is zero on the day it was captured, not one", () => {
        expect(daysWaiting(SILENT_HILL, new Date("2026-05-08T09:30:00.000Z"))).toBe(0);
    });

    it("says nothing when the id carries no date to count from", () => {
        expect(daysWaiting("id-Nioh", now)).toBeUndefined();
    });
});
