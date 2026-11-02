import { useLayoutEffect, useRef, useState } from "react";
import { backend } from "../../../../api/backend";
import { describeTarget, formatCents, todayIso } from "./money";
import { ErrorLine, NewRow, Section, smallBtn } from "./ui";
import { ToolbarRow } from "../../../../components/common/ToolbarRow";
import { errorText } from "./errorText";
import { DragHandle, SortableList } from "../../../../components/common/Sortable";
import { useSortableRow } from "../../../../hooks/useSortableRow";
import { moveItem } from "../../../../utils/reorder";
import type { Envelope, FinanceData } from "../../../../types/finances";

type Props = {
    data: FinanceData;
    onChanged: () => void;
    onOpenEnvelope: (id: string | "new") => void;
    onAssign: () => void;
};

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

    // A drop shows at once. The local order holds only while the data it was
    // made from is current: the next load brings the server's order, and with
    // it any Envelope added or restored since. A failed write drops the local
    // order, so the list returns to the old one (envelope-ux R8).
    const [order, setOrder] = useState<{ ids: string[]; madeFrom: Envelope[] } | null>(null);
    const shown = order && order.madeFrom === data.envelopes
        ? order.ids.map(id => active.find(e => e._id === id)).filter((e): e is Envelope => !!e)
        : active;

    const handleMove = async (from: number, to: number) => {
        const ids = moveItem(shown.map(e => e._id), from, to);
        setOrder({ ids, madeFrom: data.envelopes });
        setError("");
        try {
            await backend.reorderFinanceEnvelopes(ids);
            onChanged();
        } catch (e) {
            setOrder(null);
            setError(errorText(e));
        }
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
                {/* New Envelope leads the list, outside the scroll, so it is
                    never scrolled out of reach (envelope-ux R3, D6). */}
                <NewRow label="New Envelope" onClick={() => onOpenEnvelope("new")} first />
                {shown.length === 0 ? (
                    <p className="text-label text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">Add an Envelope to begin.</p>
                ) : (
                    <EnvelopeTable envelopes={shown} data={data} onOpen={onOpenEnvelope} onMove={handleMove} />
                )}
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

// Eight rows show; more scroll inside the section, under headers that stay
// put (envelope-ux R1, D1). The cap is measured from a real row, so it holds
// whatever the type scale makes a row's height.
const VISIBLE_ROWS = 8;

const EnvelopeTable = ({ envelopes, data, onOpen, onMove }: {
    envelopes: Envelope[];
    data: FinanceData;
    onOpen: (id: string) => void;
    onMove: (from: number, to: number) => void;
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        const box = scrollRef.current;
        const head = box?.querySelector("thead");
        const row = box?.querySelector("tbody tr");
        if (!head || !row || envelopes.length <= VISIBLE_ROWS) { setMaxHeight(undefined); return; }
        setMaxHeight(head.getBoundingClientRect().height + VISIBLE_ROWS * row.getBoundingClientRect().height);
    }, [envelopes.length]);

    return (
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight }}>
            <table className="w-full text-left">
                <thead>
                    <tr className="text-eyebrow uppercase tracking-widest text-nier-text-dark/50">
                        <th className={headCell}><span className="sr-only">Reorder</span></th>
                        <th className={`${headCell} pl-0`}>Envelope</th>
                        <th className={`${headCell} text-right`}>Balance</th>
                        <th className={`${headCell} text-right hidden sm:table-cell`}>Target</th>
                        <th className={`${headCell} text-right`}>Needed</th>
                    </tr>
                </thead>
                <SortableList onMove={onMove}>
                    <tbody>
                        {envelopes.map((e, i) => (
                            <EnvelopeRow key={e._id} index={i} envelope={e} data={data} onOpen={() => onOpen(e._id)} />
                        ))}
                    </tbody>
                </SortableList>
            </table>
        </div>
    );
};

// The headers stay visible while the rows scroll under them.
const headCell = "sticky top-0 z-10 bg-nier-100-lighter px-3 py-2 font-normal";

const EnvelopeRow = ({ envelope, index, data, onOpen }: {
    envelope: Envelope;
    index: number;
    data: FinanceData;
    onOpen: () => void;
}) => {
    const { balance = 0, needed = 0 } = data.summary.envelopes[envelope._id] ?? {};
    const { ref, handleRef, isDragging } = useSortableRow(envelope._id, index);
    return (
        <tr
            ref={ref}
            onClick={onOpen}
            data-testid={`envelope-${envelope.name}`}
            className={`border-t border-nier-150/30 hover:bg-nier-150/30 cursor-pointer transition-colors ${isDragging ? "bg-nier-150/50" : ""}`}
        >
            <td className="pl-1 w-9">
                <DragHandle handleRef={handleRef} label={`Reorder ${envelope.name}`} className="text-nier-text-dark/50" />
            </td>
            <td className="pr-3 py-3 text-label text-nier-text-dark truncate max-w-[10rem]">{envelope.name}</td>
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
