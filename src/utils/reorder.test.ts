import { describe, expect, it } from "vitest";
import { moveAmongVisible } from "./reorder";

// Drag reorders what the list shows; the stored order covers every item,
// shown or not (specs/finances-envelope-ux.md R11).
describe("moveAmongVisible", () => {
    const full = ["Bench", "Squat", "Row", "Deadlift", "Press"];
    const upper = ["Bench", "Row", "Press"];

    // A10: Press dragged above Row with the "upper" filter on.
    it("puts the dragged item before the visible item below it", () => {
        expect(moveAmongVisible(full, upper, 2, 1)).toEqual(["Bench", "Squat", "Press", "Row", "Deadlift"]);
    });

    it("puts an item dropped last directly after the last visible item", () => {
        expect(moveAmongVisible(full, upper, 0, 2)).toEqual(["Squat", "Row", "Deadlift", "Press", "Bench"]);
    });

    it("keeps hidden items in their places", () => {
        const out = moveAmongVisible(full, upper, 1, 0);
        expect(out.filter(n => n === "Squat" || n === "Deadlift")).toEqual(["Squat", "Deadlift"]);
        expect(out).toEqual(["Row", "Bench", "Squat", "Deadlift", "Press"]);
    });

    it("moves within the full list when nothing is hidden", () => {
        expect(moveAmongVisible(full, full, 4, 0)).toEqual(["Press", "Bench", "Squat", "Row", "Deadlift"]);
    });

    it("returns the same order for a drop in place", () => {
        expect(moveAmongVisible(full, upper, 1, 1)).toEqual(full);
    });
});
