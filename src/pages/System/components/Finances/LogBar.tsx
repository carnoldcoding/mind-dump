import { useState } from "react";
import { TextField } from "../../../../components/common/TextField";
import { backend } from "../../../../api/backend";
import { parseDollars, todayIso } from "./money";
import { EnvelopeSelect, ErrorLine, MoneyField, primaryBtn } from "./ui";
import { errorText } from "./errorText";
import type { Envelope } from "../../../../types/finances";

type Props = {
    envelopes: Envelope[];
    payees: string[];
    onSaved: () => void;
};

// Every purchase is typed in by hand (D1), so the cost of logging one decides
// whether purchases get logged at all. This bar sits above every tab, dated
// today, with only the three fields a purchase needs; a past date, a note or
// income go through the full form on the Transactions tab (D15). Two columns
// on a phone, one row from `sm` up, so it fits 360px without scrolling (R22).
const LogBar = ({ envelopes, payees, onSaved }: Props) => {
    const [amount, setAmount] = useState("");
    const [envelopeId, setEnvelopeId] = useState("");
    const [payee, setPayee] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleLog = async () => {
        const cents = parseDollars(amount);
        if (cents == null) { setError("Enter an amount"); return; }
        if (!envelopeId) { setError("Pick an Envelope"); return; }

        setSaving(true);
        setError("");
        try {
            await backend.addFinanceTransaction({
                date: todayIso(), amount: cents, kind: "spending", envelopeId, payee: payee.trim(),
            });
            // The Envelope stays picked: several purchases in a row often
            // come out of the same one.
            setAmount("");
            setPayee("");
            onSaved();
        } catch (e) {
            setError(errorText(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <section aria-label="Log spending" className="bg-nier-100-lighter border border-nier-150 relative shrink-0">
            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />
            <div className="p-3 grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-3">
                <div className="min-w-0 sm:w-32 sm:shrink-0">
                    <MoneyField label="Spent $" value={amount} onChange={setAmount} />
                </div>
                <div className="min-w-0 sm:flex-1">
                    <EnvelopeSelect label="Envelope" envelopes={envelopes} value={envelopeId} onChange={setEnvelopeId} />
                </div>
                <div className="min-w-0 sm:flex-1">
                    <TextField label="Payee" value={payee} onChange={setPayee} autofillData={payees} />
                </div>
                <button onClick={handleLog} disabled={saving} className={primaryBtn}>
                    {saving ? "…" : "Log"}
                </button>
            </div>
            {error && <div className="px-3 pb-2"><ErrorLine error={error} /></div>}
        </section>
    );
};

export default LogBar;
