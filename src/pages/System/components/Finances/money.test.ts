import { describe, expect, it } from "vitest";
import { formatCents, parseDollars } from "./money";

describe("parseDollars", () => {
    it("reads dollars and cents into integer cents", () => {
        expect(parseDollars("12.34")).toBe(1234);
        expect(parseDollars("12")).toBe(1200);
        expect(parseDollars("12.5")).toBe(1250);
        expect(parseDollars(".99")).toBe(99);
    });

    it("ignores a dollar sign, thousands commas and spaces", () => {
        expect(parseDollars(" $1,200.00 ")).toBe(120000);
    });

    // Floating point would turn 0.29 into 28.999…; cents come from the text.
    it("does not drift on amounts floats cannot hold", () => {
        expect(parseDollars("0.29")).toBe(29);
        expect(parseDollars("1.10")).toBe(110);
    });

    it("refuses empty, zero, negative and malformed input", () => {
        for (const s of ["", "0", "0.00", "-5", "12.345", "abc", "1.2.3"]) {
            expect(parseDollars(s)).toBeNull();
        }
    });
});

describe("formatCents", () => {
    it("writes dollars with two decimals and thousands commas", () => {
        expect(formatCents(123456)).toBe("$1,234.56");
        expect(formatCents(5)).toBe("$0.05");
    });

    it("puts the sign before the dollar sign", () => {
        expect(formatCents(-3000)).toBe("-$30.00");
    });
});
