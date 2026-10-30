import { useMemo, useState } from "react";
import { TextField } from "../../../../components/common/TextField";
import { backend } from "../../../../api/backend";
import { centsToInput, formatCents, parseDollars } from "./money";
import { EditorModal, ErrorLine, MoneyField, primaryBtn, secondaryBtn, smallBtn } from "./ui";
import { errorText } from "./errorText";
import type { Assignment, Envelope, FinanceData, TargetKind, Transaction } from "../../../../types/finances";

type Props = {
    open: boolean;
    /** The Envelope being edited, or null to create one. */
    envelope: Envelope | null;
    data: FinanceData;
    onClose: () => void;
    onSaved: () => void;
    onEditAssignment: (a: Assignment) => void;
    onEditTransaction: (t: Transaction) => void;
};

type TargetChoice = "none" | TargetKind;

const TARGET_CHOICES: { key: TargetChoice; label: string }[] = [
    { key: "none", label: "None" },
    { key: "fillTo", label: "Fill to" },
    { key: "addMonthly", label: "Add each month" },
];

const TARGET_HINT: Record<TargetChoice, string> = {
    none: "Receives money only when assigned by hand.",
    fillTo: "Brought up to the amount once a month. For bills and spending.",
    addMonthly: "Given the amount every month, whatever it holds. For saving up.",
};

// Name, Target, order, archive, and the Envelope's own history (R17–R19).
// An Envelope is archived rather than deleted (D18): its past Transactions
// keep pointing at it, so the Report's past months stay true.
const EnvelopeModal = ({ open, envelope, data, onClose, onSaved, onEditAssignment, onEditTransaction }: Props) => {
    const [name, setName] = useState(envelope?.name ?? "");
    const [targetKind, setTargetKind] = useState<TargetChoice>(envelope?.target?.kind ?? "none");
    const [targetAmount, setTargetAmount] = useState(envelope?.target ? centsToInput(envelope.target.amount) : "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const active = data.envelopes.filter(e => !e.archived);
    const index = envelope ? active.findIndex(e => e._id === envelope._id) : -1;
    const balance = envelope ? data.summary.envelopes[envelope._id]?.balance ?? 0 : 0;

    const history = useMemo(() => envelope ? envelopeHistory(envelope._id, data) : [], [envelope, data]);
    const nameOf = (id: string | null) => (id ? data.envelopes.find(e => e._id === id)?.name ?? "?" : "Unassigned");

    const act = async (work: () => Promise<unknown>, close = false) => {
        setError("");
        try {
            await work();
            onSaved();
            if (close) onClose();
        } catch (e) {
            setError(errorText(e));
        }
    };

    const handleSave = async () => {
        if (!name.trim()) { setError("Enter a name"); return; }
        let target = null;
        if (targetKind !== "none") {
            const cents = parseDollars(targetAmount);
            if (cents == null) { setError("Enter the Target amount"); return; }
            target = { kind: targetKind, amount: cents };
        }
        setSaving(true);
        await act(() => envelope
            ? backend.updateFinanceEnvelope(envelope._id, { name: name.trim(), target })
            : backend.addFinanceEnvelope({ name: name.trim(), target }), true);
        setSaving(false);
    };

    // Swap with the neighbour, then write the whole order back so it stays
    // dense — the same rule Body's Movement list follows.
    const move = (by: -1 | 1) => act(() => {
        const ids = active.map(e => e._id);
        [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
        return backend.reorderFinanceEnvelopes(ids);
    });

    return (
        <EditorModal open={open} title={envelope ? envelope.name : "New Envelope"} onClose={onClose}>
            <TextField label="Name" value={name} onChange={setName} />

            <div className="flex flex-col gap-1.5">
                <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">Target</span>
                <div className="flex flex-wrap gap-2">
                    {TARGET_CHOICES.map(c => (
                        <button
                            key={c.key}
                            onClick={() => setTargetKind(c.key)}
                            aria-pressed={targetKind === c.key}
                            className={`text-label uppercase tracking-wide px-4 min-h-11 border border-nier-dark cursor-pointer transition-colors ${
                                targetKind === c.key ? "bg-nier-text-dark text-nier-100-lighter" : "text-nier-text-dark hover:bg-nier-150/50"
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
                <p className="text-label text-nier-text-dark/60">{TARGET_HINT[targetKind]}</p>
            </div>
            {targetKind !== "none" && <MoneyField label="Target $" value={targetAmount} onChange={setTargetAmount} />}

            <ErrorLine error={error} />

            <div className="flex justify-end gap-2">
                <button onClick={onClose} className={secondaryBtn}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className={primaryBtn}>{saving ? "…" : "Save"}</button>
            </div>

            {envelope && (
                <>
                    <div className="flex flex-wrap items-center gap-2 border-t border-nier-150 pt-4">
                        <button onClick={() => move(-1)} disabled={index <= 0} className={smallBtn}>Move up</button>
                        <button onClick={() => move(1)} disabled={index < 0 || index >= active.length - 1} className={smallBtn}>Move down</button>
                        <span className="flex-1" />
                        <button
                            onClick={() => act(() => backend.updateFinanceEnvelope(envelope._id, { archived: true }), true)}
                            className={smallBtn}
                        >
                            Archive
                        </button>
                    </div>
                    {balance !== 0 && (
                        <p className="text-label text-nier-text-dark/60">
                            Holds {formatCents(balance)}. Archiving needs a $0 balance.
                        </p>
                    )}

                    <div className="flex flex-col">
                        <span className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50 pb-1">History</span>
                        {history.length === 0 ? (
                            <p className="text-label text-nier-text-dark/35 uppercase tracking-widest py-2">Nothing yet.</p>
                        ) : history.map(item => (
                            <button
                                key={`${item.type}-${item.record._id}`}
                                onClick={() => item.type === "assignment"
                                    ? onEditAssignment(item.record as Assignment)
                                    : onEditTransaction(item.record as Transaction)}
                                className="w-full flex items-center justify-between gap-3 py-2 border-b border-nier-150/30 last:border-0 hover:bg-nier-150/30 text-left cursor-pointer transition-colors"
                            >
                                <span className="text-eyebrow text-nier-text-dark/50 uppercase tracking-wide shrink-0">{item.record.date}</span>
                                <span className="text-label text-nier-text-dark/80 truncate flex-1">
                                    {item.type === "assignment"
                                        ? describeAssignment(item.record as Assignment, envelope._id, nameOf)
                                        : (item.record as Transaction).payee || (item.record as Transaction).note || "Spending"}
                                </span>
                                <span className={`text-label tabular-nums shrink-0 ${item.delta < 0 ? "text-red-800" : "text-nier-text-dark"}`}>
                                    {item.delta > 0 ? "+" : ""}{formatCents(item.delta)}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </EditorModal>
    );
};

type HistoryItem = { type: "assignment" | "transaction"; record: Assignment | Transaction; delta: number };

// Everything that moved this Envelope's balance, newest first.
function envelopeHistory(id: string, data: FinanceData): HistoryItem[] {
    const items: HistoryItem[] = [];
    for (const a of data.assignments) {
        if (a.envelopeId === id) items.push({ type: "assignment", record: a, delta: a.amount });
        else if (a.sourceEnvelopeId === id) items.push({ type: "assignment", record: a, delta: -a.amount });
    }
    for (const t of data.transactions) {
        if (t.kind === "spending" && t.envelopeId === id) items.push({ type: "transaction", record: t, delta: -t.amount });
    }
    return items.sort((a, b) => (a.record.date < b.record.date ? 1 : a.record.date > b.record.date ? -1 : 0));
}

function describeAssignment(a: Assignment, self: string, nameOf: (id: string | null) => string): string {
    return a.envelopeId === self ? `From ${nameOf(a.sourceEnvelopeId)}` : `To ${nameOf(a.envelopeId)}`;
}

export default EnvelopeModal;
