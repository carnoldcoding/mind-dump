import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { backend } from "../../../../api/backend";
import WorkoutGrid from "./WorkoutGrid";
import MovementChart from "./MovementChart";
import MovementList from "./MovementList";
import LogBar from "./LogBar";
import NewMovementModal from "./NewMovementModal";
import MovementEditModal from "./MovementEditModal";
import EntryEditModal from "./EntryEditModal";
import { partitionBodyDocs, describeEntry, docId } from "./entry";
import type { BodyDoc, Entry } from "./entry";
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { fade, wipe } from "../../../../utils/motion";
import { usePanelHeight } from "../../../../hooks/usePanelHeight";
import { Panel } from "../../../../components/common/Panel";

type ActiveTab = "chart" | "history";

type Props = { onClose: () => void };

const BodyWindow = ({ onClose }: Props) => {
    // No signal to wait on: this window only ever mounts well after boot is
    // done — the user has to open System, then click a folder icon — and
    // Desktop's conditional render gives it a fresh mount each time. It has no
    // decoded title and no card grid, so its whole entrance is the frame
    // arriving with its chrome a beat behind.
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => {
        wipe(tl, '[data-panel-surface]');
        fade(tl, '[data-window-chrome]', '<0.2');
    }, scope);
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();

    const [docs, setDocs]                         = useState<BodyDoc[]>([]);
    const [selectedName, setSelectedName]         = useState<string | null>(null);
    const [creating, setCreating]                 = useState(false);
    const [editingName, setEditingName]           = useState<string | null>(null);
    const [editingEntry, setEditingEntry]         = useState<Entry | null>(null);
    const [activeTab, setActiveTab]               = useState<ActiveTab>("chart");

    const fetchDocs = useCallback(async () => {
        try {
            setDocs(await backend.getBodyEntries());
        } catch { /* network error */ }
    }, []);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    // ── Derived data ────────────────────────────────────────────────
    const { movements, entries } = useMemo(() => partitionBodyDocs(docs), [docs]);

    useEffect(() => {
        if (movements.length === 0) return;
        if (selectedName === null || !movements.some(m => m.workoutName === selectedName)) {
            setSelectedName(movements[0].workoutName);
        }
    }, [movements, selectedName]);

    const selected = useMemo(
        () => movements.find(m => m.workoutName === selectedName) ?? null,
        [movements, selectedName]
    );

    const selectedEntries = useMemo(
        () => entries
            .filter(e => e.workoutName === selectedName)
            .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()),
        [entries, selectedName]
    );

    const lastEntry = selectedEntries[0] ?? null;

    const editingMovement = useMemo(
        () => movements.find(m => m.workoutName === editingName) ?? null,
        [movements, editingName]
    );

    // ── Mutations ───────────────────────────────────────────────────
    const handleDeleteMovement = useCallback(async (workoutName: string) => {
        const doomed = docs.filter(d => d.workoutName === workoutName);
        await Promise.all(doomed.map(d => {
            const id = docId(d);
            return id ? backend.removeBodyEntry(id) : Promise.resolve();
        }));
        if (selectedName === workoutName) setSelectedName(null);
        setEditingName(null);
        fetchDocs();
    }, [docs, selectedName, fetchDocs]);

    const handleDeleteEntry = useCallback(async (id: string) => {
        await backend.removeBodyEntry(id);
        fetchDocs();
    }, [fetchDocs]);

    // Every Movement gets its order rewritten, so the sequence stays dense
    // and total rather than depending on whatever the previous values were.
    // The caller names the Movement to swap with, because the neighbour the
    // user can see isn't the adjacent one when a tag filter is applied.
    const handleReorder = useCallback(async (workoutName: string, swapWith: string) => {
        const idx = movements.findIndex(m => m.workoutName === workoutName);
        const swapIdx = movements.findIndex(m => m.workoutName === swapWith);
        if (idx === -1 || swapIdx === -1) return;

        const reordered = [...movements];
        [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

        await Promise.all(reordered.map((m, order) =>
            m.id ? backend.updateBodyEntry({ id: m.id, order }) : Promise.resolve()
        ));
        fetchDocs();
    }, [movements, fetchDocs]);

    const tabBtn = (active: boolean) =>
        `text-xs uppercase tracking-wide px-4 py-2 border-b-2 transition-colors cursor-pointer ${
            active ? "border-nier-dark text-nier-text-dark" : "border-transparent text-nier-text-dark/40 hover:text-nier-text-dark"
        }`;

    return (
        <>
            <Panel
                wrapperRef={scope}
                className="bg-nier-100 border border-nier-150"
                style={maxHeight ? { maxHeight } : undefined}
                frameRef={panelRef}
            >

                    {/* Window title bar */}
                    <div data-window-chrome className="h-10 bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                        <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Body</h3>
                        <button onClick={onClose} aria-label="Close" className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none">
                            ✕
                        </button>
                    </div>

                    <div data-window-chrome className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">

                        <div className="flex gap-4 flex-col md:flex-row md:items-start">
                            <MovementList
                                movements={movements}
                                selected={selectedName}
                                onSelect={setSelectedName}
                                onEdit={setEditingName}
                                onReorder={handleReorder}
                                onCreate={() => setCreating(true)}
                            />

                            <div className="flex-1 min-w-0 flex flex-col gap-3">
                                {selected ? (
                                    <>
                                        <LogBar
                                            key={`${selected.workoutName}:${lastEntry?.id ?? "none"}`}
                                            movement={selected}
                                            lastEntry={lastEntry}
                                            onSaved={fetchDocs}
                                        />

                                        <div className="flex">
                                            <button className={tabBtn(activeTab === "chart")}   onClick={() => setActiveTab("chart")}>Chart</button>
                                            <button className={tabBtn(activeTab === "history")} onClick={() => setActiveTab("history")}>History</button>
                                        </div>

                                        {activeTab === "chart" ? (
                                            <MovementChart
                                                name={selected.displayName}
                                                entries={selectedEntries}
                                                goal={selected.goal}
                                            />
                                        ) : (
                                            <section aria-label="History" className="h-64 bg-nier-100-lighter border border-nier-150 relative flex flex-col">
                                                <div className="h-7 bg-nier-150 flex items-center px-3 shrink-0">
                                                    <span className="text-nier-text-dark text-sm uppercase tracking-wide">Entries</span>
                                                </div>
                                                <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />
                                                <div className="overflow-y-auto flex-1">
                                                    {selectedEntries.length === 0 ? (
                                                        <p className="text-xs text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">No entries yet.</p>
                                                    ) : selectedEntries.map(e => (
                                                        <button
                                                            key={e.id ?? e.datetime}
                                                            onClick={() => e.id && setEditingEntry(e)}
                                                            className="w-full flex items-center justify-between gap-3 px-3 py-3 border-b border-nier-150/30 last:border-0 hover:bg-nier-150/30 text-left cursor-pointer transition-colors"
                                                        >
                                                            <span className="text-[10px] text-nier-text-dark/50 uppercase tracking-wide shrink-0">
                                                                {new Date(e.datetime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                                            </span>
                                                            <span className="text-xs text-nier-text-dark">{describeEntry(e)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </>
                                ) : (
                                    <div className="h-64 bg-nier-100-lighter border border-nier-150 flex items-center justify-center">
                                        <span className="text-nier-text-dark/40 text-xs uppercase tracking-widest">
                                            {movements.length === 0 ? "Add a movement to begin" : "Select a movement"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Review artifact, so it sits below the things you came to do. */}
                        <WorkoutGrid entries={entries} />
                    </div>
            </Panel>

            {creating && (
                <NewMovementModal
                    order={movements.length}
                    onClose={() => setCreating(false)}
                    onSaved={(workoutName) => { setSelectedName(workoutName); fetchDocs(); }}
                />
            )}

            {editingMovement && (
                <MovementEditModal
                    movement={editingMovement}
                    onClose={() => setEditingName(null)}
                    onSaved={fetchDocs}
                    onDelete={handleDeleteMovement}
                />
            )}

            {editingEntry && selected && (
                <EntryEditModal
                    entry={editingEntry}
                    movementName={selected.displayName}
                    onClose={() => setEditingEntry(null)}
                    onSaved={() => { fetchDocs(); setEditingEntry(null); }}
                    onDelete={id => { handleDeleteEntry(id); setEditingEntry(null); }}
                />
            )}
        </>
    );
};

export default BodyWindow;
