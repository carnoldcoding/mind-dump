import { describe, expect, it } from "vitest";
import {
    cumulativeByDay, dailySpending, largest, lastMonths, monthTotals, monthlySeries,
    payeeSuggestions, spendingByEnvelope,
} from "./report";
import type { Transaction } from "../../../../types/finances";

let n = 0;
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => ({
    _id: String(++n),
    date,
    amount,
    kind: "spending",
    envelopeId: "groceries",
    payee: "",
    note: "",
    startingBalance: false,
    scheduleId: null,
    ...over,
});
const pay = (date: string, amount: number, over: Partial<Transaction> = {}) =>
    tx(date, amount, { kind: "income", envelopeId: null, ...over });

// Three months of sample data, summed by hand (A11).
const sample: Transaction[] = [
    pay("2026-08-01", 500000, { startingBalance: true }),
    pay("2026-08-01", 150000), pay("2026-08-15", 150000),
    tx("2026-08-03", 120000, { envelopeId: "rent", payee: "Landlord" }),
    tx("2026-08-09", 8000, { payee: "Kroger" }),
    pay("2026-09-01", 150000), pay("2026-09-15", 150000),
    tx("2026-09-03", 120000, { envelopeId: "rent", payee: "Landlord" }),
    tx("2026-09-10", 9000, { payee: "Kroger" }),
    tx("2026-09-10", 1000, { envelopeId: "fun", payee: "Cinema" }),
    tx("2026-09-28", 30000, { envelopeId: "fun", note: "concert" }),
    pay("2026-10-01", 150000),
    tx("2026-10-02", 4000, { payee: "Kroger" }),
];

describe("monthTotals (chart 1)", () => {
    it("sums income, spending and net for the month", () => {
        expect(monthTotals(sample, "2026-09")).toEqual({
            income: 300000, spending: 160000, net: 140000, savingsRate: 140000 / 300000,
        });
    });

    // The starting balance is money already held, not October's pay (R29).
    it("leaves out the starting balance", () => {
        expect(monthTotals(sample, "2026-08").income).toBe(300000);
    });

    it("has no savings rate in a month with no income", () => {
        expect(monthTotals(sample, "2026-07").savingsRate).toBeNull();
    });
});

describe("months", () => {
    it("lists the 12 months that end with the chosen one, oldest first", () => {
        const months = lastMonths("2027-02", 12);
        expect(months).toHaveLength(12);
        expect(months[0]).toBe("2026-03");
        expect(months[11]).toBe("2027-02");
    });

    it("builds a monthly series for charts 2 and 8", () => {
        const series = monthlySeries(sample, "2026-10", 3);
        expect(series.map(s => [s.month, s.income, s.spending])).toEqual([
            ["2026-08", 300000, 128000],
            ["2026-09", 300000, 160000],
            ["2026-10", 150000, 4000],
        ]);
    });
});

describe("spendingByEnvelope (charts 3, 4, 7)", () => {
    it("sums each Envelope's spending in the month", () => {
        expect(Object.fromEntries(spendingByEnvelope(sample, "2026-09"))).toEqual({
            rent: 120000, groceries: 9000, fun: 31000,
        });
    });
});

describe("cumulativeByDay (chart 5)", () => {
    it("runs a total for every day of the month", () => {
        const days = cumulativeByDay(sample, "2026-09");
        expect(days).toHaveLength(30);
        expect(days[1]).toBe(0);
        expect(days[2]).toBe(120000);
        expect(days[9]).toBe(130000);
        expect(days[29]).toBe(160000);
    });
});

describe("dailySpending (chart 6)", () => {
    it("sums spending by date", () => {
        expect(Object.fromEntries(dailySpending(sample, "2026-09"))).toEqual({
            "2026-09-03": 120000, "2026-09-10": 10000, "2026-09-28": 30000,
        });
    });
});

describe("largest (chart 9)", () => {
    it("ranks the month's spending, largest first", () => {
        expect(largest(sample, "2026-09", 2).map(t => t.amount)).toEqual([120000, 30000]);
    });
});

describe("payeeSuggestions (R21)", () => {
    it("orders payees by how often they were used", () => {
        expect(payeeSuggestions(sample)).toEqual(["Kroger", "Landlord", "Cinema"]);
    });
});
