import { describe, expect, it } from "vitest";
import { readoutsFor } from "./readouts";
import { makeReview } from "../test/reviews";

const at = (date: string) => new Date(`${date}T12:00:00Z`);

describe("readoutsFor", () => {
    it("counts what is in progress and what is queued", () => {
        const readouts = readoutsFor([
            makeReview("A", { status: "active" }),
            makeReview("B", { status: "active" }),
            makeReview("C", { status: "todo" }),
            makeReview("D", { status: "done" }),
        ]);

        expect(readouts.inProgress).toBe(2);
        expect(readouts.queued).toBe(1);
    });

    it("counts only what was finished this calendar year", () => {
        const readouts = readoutsFor([
            makeReview("A", { status: "done", date_completed: "2026-01-01" }),
            makeReview("B", { status: "done", date_completed: "2026-12-31" }),
            makeReview("C", { status: "done", date_completed: "2025-12-31" }),
        ], at("2026-08-02"));

        expect(readouts.finishedThisYear).toBe(2);
    });

    it("does not count something unfinished as finished this year", () => {
        const readouts = readoutsFor([
            makeReview("A", { status: "todo", date_completed: "2026-01-01" }),
        ], at("2026-08-02"));

        expect(readouts.finishedThisYear).toBe(0);
    });

    it("averages the ratings of finished Reviews", () => {
        const readouts = readoutsFor([
            makeReview("A", { status: "done", rating: 8 }),
            makeReview("B", { status: "done", rating: 10 }),
        ]);

        expect(readouts.averageRating).toBe(9);
    });

    // A Review rated 0 was rated. This is the same absence-versus-falsiness
    // distinction the Review detail page had to make.
    it("counts a rating of zero towards the average", () => {
        const readouts = readoutsFor([
            makeReview("A", { status: "done", rating: 0 }),
            makeReview("B", { status: "done", rating: 10 }),
        ]);

        expect(readouts.averageRating).toBe(5);
    });

    it("ignores unfinished Reviews when averaging", () => {
        const readouts = readoutsFor([
            makeReview("A", { status: "done", rating: 10 }),
            makeReview("B", { status: "todo", rating: 2 }),
        ]);

        expect(readouts.averageRating).toBe(10);
    });

    it("has no average when nothing is finished", () => {
        const readouts = readoutsFor([makeReview("A", { status: "todo", rating: 5 })]);

        expect(readouts.averageRating).toBeNull();
    });

    it("has no average when finished Reviews carry no rating at all", () => {
        const readouts = readoutsFor([
            makeReview("A", { status: "done", rating: undefined }),
        ]);

        expect(readouts.averageRating).toBeNull();
    });

    it("reads an empty collection as all zeroes", () => {
        const readouts = readoutsFor([]);

        expect(readouts).toEqual({
            inProgress: 0,
            queued: 0,
            finishedThisYear: 0,
            averageRating: null,
        });
    });
});
