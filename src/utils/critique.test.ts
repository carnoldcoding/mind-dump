import { describe, expect, it } from "vitest";
import { sectionsFor, writtenSections } from "./critique";

describe("the sections a Category offers", () => {
    it("gives each Category its own four", () => {
        expect(sectionsFor("game")).toEqual(["story", "gameplay", "graphics", "sound"]);
        expect(sectionsFor("cinema")).toEqual(["story", "cinematography", "casting", "sound"]);
        expect(sectionsFor("book")).toEqual(["story", "world", "characters", "writing"]);
    });

    it("offers none for a Category it does not know", () => {
        expect(sectionsFor("journal")).toEqual([]);
    });
});

// Four is what a Category makes available, never a target — a game with
// nothing worth saying about story is finished at three. See CONTEXT.md, and
// note there is deliberately no `sectionCount` or `progress` here to tempt a
// caller into rendering a fraction.
describe("the sections actually written", () => {
    it("lists the ones with text in them, in the Category's own order", () => {
        expect(writtenSections({
            type: "game",
            review: { sound: "Great", story: "Good" },
        })).toEqual(["story", "sound"]);
    });

    it("ignores a section that exists but is empty", () => {
        expect(writtenSections({
            type: "game",
            review: { story: "Good", gameplay: "", graphics: "   " },
        })).toEqual(["story"]);
    });

    it("ignores a key the Category does not offer", () => {
        // A book's fields on a game record: whatever wrote that, it isn't
        // something this Category can show.
        expect(writtenSections({
            type: "game",
            review: { story: "Good", characters: "Written" },
        })).toEqual(["story"]);
    });

    it("returns nothing for a Review with no critique at all", () => {
        expect(writtenSections({ type: "cinema", review: {} })).toEqual([]);
        expect(writtenSections({ type: "cinema" })).toEqual([]);
    });
});
