import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import FinancesWindow from "./index";
import { backend } from "../../../../api/backend";
import type { FinanceData } from "../../../../types/finances";

// The app's one boundary to the server; faking it lets these tests drive the
// window as a user would. The budget arithmetic itself is the backend's, and
// is tested there — here the summary is given, and the question is whether
// the window shows it and sends the right requests.
vi.mock("../../../../api/backend", () => ({
    backend: {
        getFinances: vi.fn(),
        addFinanceTransaction: vi.fn(),
        updateFinanceTransaction: vi.fn(),
        removeFinanceTransaction: vi.fn(),
        addFinanceAssignment: vi.fn(),
        updateFinanceAssignment: vi.fn(),
        removeFinanceAssignment: vi.fn(),
        fundFinanceTargets: vi.fn(),
        addFinanceEnvelope: vi.fn(),
        updateFinanceEnvelope: vi.fn(),
        reorderFinanceEnvelopes: vi.fn(),
        addFinanceSchedule: vi.fn(),
        updateFinanceSchedule: vi.fn(),
        removeFinanceSchedule: vi.fn(),
    },
}));

// chart.js needs a real canvas; jsdom has none. The charts' numbers are
// tested in report.test.ts, and how they look is checked by eye.
vi.mock("react-chartjs-2", () => ({
    Bar: () => <div data-testid="chart" />,
    Chart: () => <div data-testid="chart" />,
    Doughnut: () => <div data-testid="chart" />,
    Line: () => <div data-testid="chart" />,
}));

const mocked = vi.mocked(backend);

const sample = (over: Partial<FinanceData> = {}): FinanceData => ({
    today: "2026-10-20",
    envelopes: [
        { _id: "g", name: "Groceries", sortOrder: 0, target: { kind: "fillTo", amount: 40000 }, archived: false },
        { _id: "f", name: "Fun", sortOrder: 1, target: null, archived: false },
    ],
    transactions: [
        { _id: "t2", date: "2026-10-05", amount: 43000, kind: "spending", envelopeId: "g", payee: "Kroger", note: "", startingBalance: false, scheduleId: null },
        { _id: "t1", date: "2026-10-01", amount: 300000, kind: "income", envelopeId: null, payee: "Paycheck", note: "", startingBalance: false, scheduleId: "s1" },
    ],
    assignments: [{ _id: "a1", date: "2026-10-01", amount: 40000, envelopeId: "g", sourceEnvelopeId: null }],
    schedules: [{ _id: "s1", payee: "Paycheck", amount: 300000, kind: "income", envelopeId: null, note: "", days: [1, 15], lastRecorded: "2026-10-15" }],
    summary: { unassigned: 260000, envelopes: { g: { balance: -3000, needed: 0, gap: 0 }, f: { balance: 0, needed: 0, gap: 0 } } },
    ...over,
});

const renderWindow = async (data = sample()) => {
    mocked.getFinances.mockResolvedValue(data);
    render(<FinancesWindow />);
    await screen.findByTestId("unassigned");
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 20, 9, 30));
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
        expect(mocked.getFinances).toHaveBeenCalledWith("2026-10-20");
    });
});

describe("Envelopes tab (R12, R13)", () => {
    it("shows Unassigned and each Envelope's balance", async () => {
        await renderWindow();
        expect(screen.getByTestId("unassigned").textContent).toBe("$2,600.00");
        expect(within(screen.getByTestId("envelope-Groceries")).getByTestId("balance").textContent).toBe("-$30.00");
    });

    it("marks a negative balance and a negative Unassigned in the error color", async () => {
        await renderWindow(sample({ summary: { unassigned: -500, envelopes: { g: { balance: -3000, needed: 0, gap: 0 }, f: { balance: 0, needed: 0, gap: 0 } } } }));
        expect(screen.getByTestId("unassigned").className).toContain("text-red-800");
        expect(within(screen.getByTestId("envelope-Groceries")).getByTestId("balance").className).toContain("text-red-800");
        expect(within(screen.getByTestId("envelope-Fun")).getByTestId("balance").className).not.toContain("text-red-800");
    });

    it("funds targets as of today and reloads", async () => {
        const data = sample({ summary: { unassigned: 260000, envelopes: { g: { balance: 0, needed: 25000, gap: 25000 }, f: { balance: 0, needed: 0, gap: 0 } } } });
        await renderWindow(data);
        mocked.fundFinanceTargets.mockResolvedValue([]);
        fireEvent.click(screen.getByRole("button", { name: "Fund targets" }));
        await waitFor(() => expect(mocked.fundFinanceTargets).toHaveBeenCalledWith("2026-10-20"));
        await waitFor(() => expect(mocked.getFinances).toHaveBeenCalledTimes(2));
    });

    it("leaves reorder to the tab's drag handles (envelope-ux R5, R9)", async () => {
        await renderWindow();
        expect(screen.getByRole("button", { name: "Reorder Groceries" })).toBeTruthy();
        fireEvent.click(screen.getByTestId("envelope-Groceries"));
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).queryByRole("button", { name: "Move up" })).toBeNull();
        expect(within(dialog).queryByRole("button", { name: "Move down" })).toBeNull();
    });

    it("puts New Envelope above the list (envelope-ux R3)", async () => {
        await renderWindow();
        const newRow = screen.getByRole("button", { name: "New Envelope" });
        const firstRow = screen.getByTestId("envelope-Groceries");
        expect(newRow.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("shows the server's reason when archiving is refused (R19)", async () => {
        await renderWindow();
        mocked.updateFinanceEnvelope.mockRejectedValue(new Error("POST /api/finances/envelopes/update failed (409): move this Envelope's money out before archiving it"));
        fireEvent.click(screen.getByTestId("envelope-Groceries"));
        fireEvent.click(await screen.findByRole("button", { name: "Archive" }));
        expect(await screen.findByText("Move this Envelope's money out before archiving it")).toBeTruthy();
    });
});

describe("Assign / Move form (envelope-ux R13–R18)", () => {
    // Groceries: −$30.00, Fill to $400.00, needs $430.00. Fun: $0.00, no Target.
    const data = () => sample({ summary: { unassigned: 260000, envelopes: {
        g: { balance: -3000, needed: 43000, gap: 43000 }, f: { balance: 0, needed: 0, gap: 0 },
    } } });
    const openForm = async () => {
        await renderWindow(data());
        fireEvent.click(screen.getByRole("button", { name: "Assign / Move" }));
        return screen.findByRole("dialog");
    };
    const optionTexts = (select: HTMLElement) => [...select.querySelectorAll("option")].map(o => o.textContent);

    it("names each Envelope with its balance, and what a Target still needs (R13)", async () => {
        const form = await openForm();
        expect(optionTexts(within(form).getByLabelText("To"))).toEqual([
            "Unassigned — $2,600.00",
            "Groceries — -$30.00 · needs $430.00",
            "Fun — $0.00",
        ]);
    });

    it("shows each end before and after, updating as the amount is typed (R14, R15, R17)", async () => {
        const form = await openForm();
        fireEvent.change(within(form).getByLabelText("From"), { target: { value: "f" } });
        fireEvent.change(within(form).getByLabelText("To"), { target: { value: "g" } });
        fireEvent.change(within(form).getByLabelText("Amount $"), { target: { value: "30" } });

        const from = within(form).getByTestId("card-from");
        const to = within(form).getByTestId("card-to");
        expect(within(from).getByTestId("balance").textContent).toBe("$0.00 → -$30.00");
        expect(within(from).getByTestId("balance-after").className).toContain("text-red-800");
        expect(within(to).getByTestId("balance").textContent).toBe("-$30.00 → $0.00");
        expect(within(to).getByTestId("needed").textContent).toBe("$430.00 → $400.00");
        expect(within(to).getByText("Fill to $400.00")).toBeTruthy();

        fireEvent.change(within(form).getByLabelText("From"), { target: { value: "" } });
        expect(within(within(form).getByTestId("card-from")).getByTestId("balance").textContent).toBe("$2,600.00 → $2,570.00");
    });

    it("moves money from an Envelope back to Unassigned (R18)", async () => {
        const form = await openForm();
        mocked.addFinanceAssignment.mockResolvedValue({});
        fireEvent.change(within(form).getByLabelText("From"), { target: { value: "f" } });
        fireEvent.change(within(form).getByLabelText("To"), { target: { value: "" } });
        fireEvent.change(within(form).getByLabelText("Amount $"), { target: { value: "10" } });
        fireEvent.click(within(form).getByRole("button", { name: "Save" }));

        await waitFor(() => expect(mocked.addFinanceAssignment).toHaveBeenCalledWith({
            date: "2026-10-20", amount: 1000, envelopeId: null, sourceEnvelopeId: "f",
        }));
    });

    it("lists a move to Unassigned in the source Envelope's history (R23)", async () => {
        await renderWindow(sample({
            assignments: [{ _id: "a2", date: "2026-10-06", amount: 2500, envelopeId: null, sourceEnvelopeId: "f" }],
        }));
        fireEvent.click(screen.getByTestId("envelope-Fun"));
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText(/To Unassigned/)).toBeTruthy();
        expect(within(dialog).getByText("-$25.00")).toBeTruthy();
    });

    it("refuses a move with Unassigned at both ends", async () => {
        const form = await openForm();
        fireEvent.change(within(form).getByLabelText("Amount $"), { target: { value: "10" } });
        fireEvent.click(within(form).getByRole("button", { name: "Save" }));
        expect(await within(form).findByText("Pick an Envelope for one end")).toBeTruthy();
        expect(mocked.addFinanceAssignment).not.toHaveBeenCalled();
    });
});

describe("log bar (R20, R21)", () => {
    it("records spending dated today against the picked Envelope", async () => {
        await renderWindow();
        mocked.addFinanceTransaction.mockResolvedValue({});
        const bar = screen.getByRole("region", { name: "Log spending" });
        fireEvent.change(within(bar).getByLabelText("Spent $"), { target: { value: "12.50" } });
        fireEvent.change(within(bar).getByLabelText("Envelope"), { target: { value: "f" } });
        fireEvent.change(within(bar).getByLabelText("Payee"), { target: { value: "Cinema" } });
        fireEvent.click(within(bar).getByRole("button", { name: "Log" }));

        await waitFor(() => expect(mocked.addFinanceTransaction).toHaveBeenCalledWith({
            date: "2026-10-20", amount: 1250, kind: "spending", envelopeId: "f", payee: "Cinema",
        }));
    });

    it("refuses to log without an amount", async () => {
        await renderWindow();
        const bar = screen.getByRole("region", { name: "Log spending" });
        fireEvent.click(within(bar).getByRole("button", { name: "Log" }));
        expect(await within(bar).findByText("Enter an amount")).toBeTruthy();
        expect(mocked.addFinanceTransaction).not.toHaveBeenCalled();
    });

    it("suggests past payees before anything is typed", async () => {
        await renderWindow();
        const bar = screen.getByRole("region", { name: "Log spending" });
        fireEvent.focus(within(bar).getByLabelText("Payee"));
        expect(within(bar).getByText("Kroger")).toBeTruthy();
    });

    it("stays on screen on every tab", async () => {
        await renderWindow();
        for (const tab of ["Transactions", "Report", "Envelopes"]) {
            fireEvent.click(screen.getByRole("button", { name: tab }));
            expect(screen.getByRole("region", { name: "Log spending" })).toBeTruthy();
        }
    });

    it("offers archived Envelopes nowhere in its picker", async () => {
        const data = sample();
        data.envelopes[1].archived = true;
        await renderWindow(data);
        const picker = within(screen.getByRole("region", { name: "Log spending" })).getByLabelText("Envelope");
        expect(within(picker).queryByRole("option", { name: "Fun" })).toBeNull();
    });
});

describe("Transactions tab (R23, R25)", () => {
    it("lists the month's Transactions and the Scheduled ones", async () => {
        await renderWindow();
        fireEvent.click(screen.getByRole("button", { name: "Transactions" }));
        expect(screen.getByText("October 2026")).toBeTruthy();
        expect(screen.getByText("Kroger")).toBeTruthy();
        expect(screen.getByText("1st, 15th · Income")).toBeTruthy();
    });

    it("steps to an earlier month", async () => {
        await renderWindow();
        fireEvent.click(screen.getByRole("button", { name: "Transactions" }));
        fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
        expect(screen.getByText("September 2026")).toBeTruthy();
        expect(screen.getByText("No Transactions this month.")).toBeTruthy();
    });
});

describe("Report tab (R29, R30)", () => {
    it("shows the month's totals in the tiles", async () => {
        await renderWindow();
        fireEvent.click(screen.getByRole("button", { name: "Report" }));
        expect(screen.getByTestId("tile-Income").textContent).toBe("$3,000.00");
        expect(screen.getByTestId("tile-Spending").textContent).toBe("$430.00");
        expect(screen.getByTestId("tile-Net").textContent).toBe("$2,570.00");
    });
});
