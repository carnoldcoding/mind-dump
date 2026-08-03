import { describe, expect, it } from "vitest";
import { toRating } from "./rating";

describe("reading a rating off the API", () => {
    // The reason this exists: 40 of the 45 stored Reviews carry their rating as
    // a string and the rest carry a number, so every `typeof r === "number"`
    // check in the app was silently dropping almost the whole collection.
    it("reads a rating the API sent as a string", () => {
        expect(toRating("4")).toBe(4);
        expect(toRating("3.5")).toBe(3.5);
    });

    it("leaves one that already is a number alone", () => {
        expect(toRating(4)).toBe(4);
        expect(toRating(3.8)).toBe(3.8);
    });

    it("tolerates whitespace around it", () => {
        expect(toRating("  4.5  ")).toBe(4.5);
    });

    // A Review rated 0 was rated. This distinction is made in three other
    // places already; getting it wrong here would undo all of them at once.
    it("keeps a rating of zero, which is a rating", () => {
        expect(toRating(0)).toBe(0);
        expect(toRating("0")).toBe(0);
    });

    it("reports no rating at all as absent rather than as zero", () => {
        expect(toRating("")).toBeUndefined();
        expect(toRating("   ")).toBeUndefined();
        expect(toRating(null)).toBeUndefined();
        expect(toRating(undefined)).toBeUndefined();
    });

    // Absent rather than NaN: NaN is a number by `typeof`, so letting one
    // through would put the trap back exactly where it was taken out.
    it("reports something that is not a number at all as absent", () => {
        expect(toRating("unrated")).toBeUndefined();
        expect(toRating(NaN)).toBeUndefined();
        expect(toRating({})).toBeUndefined();
        expect(toRating([])).toBeUndefined();
    });
});
