import { useState } from "react";
import { backend } from "../../../../api/backend";
import { formatCents, todayIso } from "./money";
import { ErrorLine, NewRow, Section, smallBtn } from "./ui";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";
import { errorText } from "./errorText";
import type { Envelope, FinanceData, Target } from "../../../../types/finances";

type Props = {
    data: FinanceData;
    onChanged: () => void;
    onOpenEnvelope: (id: string | "new") => void;
    onAssign: () => void;
};

function describeTarget(target: Target | null): string {
    if (!target) return "—";
    return target.kind === "fillTo" ? `Fill to ${formatCents(target.amount)}` : `Add ${formatCents(target.amount)}/mo`;
}

const negative = (cents: number) => (cents < 0 ? "text-red-800" : "text-nier-text-dark");

// The home tab: what can still be spent (D9). Unassigned sits on top because
// zero-based budgeting is the job of bringing it to $0; each Envelope shows
// what it holds and what its Target still needs this month (R12–R14).
const EnvelopesTab = ({ data, onChanged, onOpenEnvelope, onAssign }: Props) => {
    const [funding, setFunding] = useState(false);
    const [error, setError] = useState("");
    const [showArchived, setShowArchived] = useState(false);

    const active = data.envelopes.filter(e => !e.archived);
    const archived = data.envelopes.filter(e => e.archived);
    const totalNeeded = active.reduce((n, e) => n + (data.summary.envelopes[e._id]?.needed ?? 0), 0);

    const run = async (work: () => Promise<unknown>) => {
        setError("");
        try { await work(); onChanged(); } catch (e) { setError(errorText(e)); }
    };

    const handleFund = async () => {
        setFunding(true);
        await run(() => backend.fundFinanceTargets(todayIso()));
        setFunding(false);
    };

    const unassigned = data.summary.unassigned;

    return (
        <div className="flex flex-col gap-4">
            <Section title="Unassigned">
                {/* The actions that move Unassigned sit beside the amount they move. */}
                <div className="px-3 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <span data-testid="unassigned" className={`text-title tracking-wide ${negative(unassigned)}`}>
                            {formatCents(unassigned)}
                        </span>
                        <span className="text-label text-nier-text-dark/60">
                            Targets need {formatCents(totalNeeded)} this month
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={handleFund}
                            disabled={funding || unassigned <= 0 || totalNeeded === 0}
                            className={smallBtn}
                        >
                            {funding ? "…" : "Fund targets"}
                        </button>
                        <button onClick={onAssign} className={smallBtn}>Assign / Move</button>
                    </div>
                </div>
                {error && <div className="px-3 pb-2"><ErrorLine error={error} /></div>}
            </Section>

            <Section title="Envelopes">
                {active.length === 0 ? (
                    <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">Add an Envelope to begin.</p>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">
                                <th className="px-3 py-2 font-normal">Envelope</th>
                                <th className="px-3 py-2 font-normal text-right">Balance</th>
                                <th className="px-3 py-2 font-normal text-right hidden sm:table-cell">Target</th>
                                <th className="px-3 py-2 font-normal text-right">Needed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.map(e => <EnvelopeRow key={e._id} envelope={e} data={data} onOpen={() => onOpenEnvelope(e._id)} />)}
                        </tbody>
                    </table>
                )}
                <NewRow label="New Envelope" onClick={() => onOpenEnvelope("new")} />
            </Section>

            {archived.length > 0 && (
                <Section title="Archived">
                    <ToolbarRow>
                        <button onClick={() => setShowArchived(s => !s)} aria-expanded={showArchived} className={smallBtn}>
                            {showArchived ? "Hide" : "Show"}
                        </button>
                    </ToolbarRow>
                    {showArchived && archived.map(e => (
                        <div key={e._id} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-nier-150/30 last:border-0">
                            <span className="text-label text-nier-text-dark/70 truncate">{e.name}</span>
                            <button
                                onClick={() => run(() => backend.updateFinanceEnvelope(e._id, { archived: false }))}
                                className={smallBtn}
                            >
                                Restore
                            </button>
                        </div>
                    ))}
                </Section>
            )}
        </div>
    );
};

const EnvelopeRow = ({ envelope, data, onOpen }: { envelope: Envelope; data: FinanceData; onOpen: () => void }) => {
    const { balance = 0, needed = 0 } = data.summary.envelopes[envelope._id] ?? {};
    return (
        <tr
            onClick={onOpen}
            data-testid={`envelope-${envelope.name}`}
            className="border-t border-nier-150/30 hover:bg-nier-150/30 cursor-pointer transition-colors"
        >
            <td className="px-3 py-3 text-label text-nier-text-dark truncate max-w-[10rem]">{envelope.name}</td>
            <td data-testid="balance" className={`px-3 py-3 text-label text-right tabular-nums ${negative(balance)}`}>
                {formatCents(balance)}
            </td>
            <td className="px-3 py-3 text-label text-right text-nier-text-dark/70 hidden sm:table-cell">
                {describeTarget(envelope.target)}
            </td>
            <td className="px-3 py-3 text-label text-right tabular-nums text-nier-text-dark/80">
                {envelope.target ? formatCents(needed) : "—"}
            </td>
        </tr>
    );
};

export default EnvelopesTab;
