import { useState } from "react";
import { TextField } from "../../../../components/common/TextField";
import { DateField } from "../../../../components/common/DateField";
import { backend } from "../../../../api/backend";
import { centsToInput, parseDollars, todayIso } from "./money";
import { EditorModal, EnvelopeSelect, ErrorLine, MoneyField, primaryBtn, secondaryBtn } from "./ui";
import { errorText } from "./errorText";
import type { Envelope, Transaction, TransactionKind } from "../../../../types/finances";

type Props = {
    open: boolean;
    /** The Transaction being edited, or null for a new one. */
    transaction: Transaction | null;
    envelopes: Envelope[];
    payees: string[];
    onClose: () => void;
    onSaved: () => void;
};

export const KindToggle = ({ kind, onChange }: { kind: TransactionKind; onChange: (k: TransactionKind) => void }) => (
    <div className="flex gap-2">
        {(["spending", "income"] as const).map(k => (
            <button
                key={k}
                onClick={() => onChange(k)}
                aria-pressed={kind === k}
                className={`flex-1 text-label uppercase tracking-wide px-4 min-h-11 border border-nier-dark cursor-pointer transition-colors ${
                    kind === k ? "bg-nier-text-dark text-nier-100-lighter" : "text-nier-text-dark hover:bg-nier-150/50"
                }`}
            >
                {k}
            </button>
        ))}
    </div>
);

// The full form (R24): spending or income, any date, a note, and the one-off
// starting balance. A Transaction a schedule recorded edits like any other;
// the schedule itself is left alone.
const TransactionModal = ({ open, transaction, envelopes, payees, onClose, onSaved }: Props) => {
    const [kind, setKind] = useState<TransactionKind>(transaction?.kind ?? "spending");
    const [amount, setAmount] = useState(transaction ? centsToInput(transaction.amount) : "");
    const [envelopeId, setEnvelopeId] = useState(transaction?.envelopeId ?? "");
    const [date, setDate] = useState(transaction?.date ?? todayIso());
    const [payee, setPayee] = useState(transaction?.payee ?? "");
    const [note, setNote] = useState(transaction?.note ?? "");
    const [startingBalance, setStartingBalance] = useState(transaction?.startingBalance ?? false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        const cents = parseDollars(amount);
        if (cents == null) { setError("Enter an amount"); return; }
        if (kind === "spending" && !envelopeId) { setError("Pick an Envelope"); return; }

        setSaving(true);
        setError("");
        const payload = {
            date, amount: cents, kind, payee, note,
            envelopeId: kind === "spending" ? envelopeId : null,
            startingBalance: kind === "income" && startingBalance,
        };
        try {
            if (transaction) await backend.updateFinanceTransaction(transaction._id, payload);
            else await backend.addFinanceTransaction(payload);
            onSaved();
            onClose();
        } catch (e) {
            setError(errorText(e));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!transaction) return;
        try {
            await backend.removeFinanceTransaction(transaction._id);
            onSaved();
            onClose();
        } catch (e) {
            setError(errorText(e));
        }
    };

    return (
        <EditorModal open={open} title={transaction ? "Edit Transaction" : "New Transaction"} onClose={onClose}>
            <KindToggle kind={kind} onChange={setKind} />
            <MoneyField label="Amount $" value={amount} onChange={setAmount} />
            {kind === "spending"
                ? <EnvelopeSelect label="Envelope" envelopes={envelopes} value={envelopeId} onChange={setEnvelopeId} />
                : <p className="text-label text-nier-text-dark/60">Income goes to Unassigned.</p>}
            <DateField label="Date" value={date} onChange={setDate} />
            <TextField label="Payee" value={payee} onChange={setPayee} autofillData={payees} />
            <TextField label="Note" value={note} onChange={setNote} />

            {kind === "income" && (
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={startingBalance}
                        onChange={e => setStartingBalance(e.target.checked)}
                        className="mt-1 w-5 h-5 accent-nier-dark"
                    />
                    <span className="text-label text-nier-text-dark">
                        Starting balance — the money already held on day one. The Report leaves it out of income.
                    </span>
                </label>
            )}

            <ErrorLine error={error} />

            <div className="flex justify-between gap-2 pt-1">
                {transaction ? <button onClick={handleDelete} className={secondaryBtn}>Delete</button> : <span />}
                <div className="flex gap-2">
                    <button onClick={onClose} className={secondaryBtn}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} className={primaryBtn}>{saving ? "…" : "Save"}</button>
                </div>
            </div>
        </EditorModal>
    );
};

export default TransactionModal;
