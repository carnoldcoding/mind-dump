// Money crosses the API as integer cents (spec R1). These are the only two
// places it becomes text and comes back, so a float never holds a dollar
// amount anywhere in between.

const DOLLARS = /^(\d*)(?:\.(\d{1,2}))?$/;

/** "$1,200.50" → 120050. Null for anything that is not a positive amount. */
export function parseDollars(text: string): number | null {
    const cleaned = text.replace(/[\s$,]/g, "");
    const m = DOLLARS.exec(cleaned);
    if (!m || (m[1] === "" && m[2] === undefined)) return null;
    const cents = Number(m[1] || "0") * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
    return cents > 0 ? cents : null;
}

const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 120050 → "$1,200.50"; −3000 → "-$30.00". */
export function formatCents(cents: number): string {
    return formatter.format(cents / 100);
}

/** 120050 → "1200.50", for seeding an input with an existing amount. */
export function centsToInput(cents: number): string {
    return (cents / 100).toFixed(2);
}

/** The browser's calendar date, YYYY-MM-DD — the "today" every request sends. */
export function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
