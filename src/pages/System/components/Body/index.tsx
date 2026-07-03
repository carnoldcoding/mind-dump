import { useEffect, useMemo, useState, useCallback } from "react";
import config from "../../../../config";
import WorkoutGrid from "./WorkoutGrid";
import MovementChart from "./MovementChart";
import WorkoutModal from "./WorkoutModal";
import MovementEditModal from "./MovementEditModal";
import EntryEditModal from "./EntryEditModal";
import type { ModalMode } from "./WorkoutModal";
import type { MovementMeta } from "./MovementEditModal";
import type { EntryToEdit } from "./EntryEditModal";

type RawEntry = {
    id?: string;
    _id?: string;
    workoutName: string;
    weightUsed?: number;
    weightGoal?: number;
    repGoal?: number;
    setGoal?: number;
    repsCompleted?: number;
    setsCompleted?: number;
    datetime: string;
    _meta?: boolean;
    displayName?: string;
    tag?: "upper" | "lower" | null;
    notes?: string;
    order?: number;
};

type TagFilter = "all" | "upper" | "lower";
type ActiveTab = "chart" | "notes" | "history";

type Props = { onClose: () => void };

const BodyWindow = ({ onClose }: Props) => {
    const [entries, setEntries]                   = useState<RawEntry[]>([]);
    const [selectedMovement, setSelectedMovement] = useState<string | null>(null);
    const [modal, setModal]                       = useState<ModalMode | null>(null);
    const [editingMovement, setEditingMovement]   = useState<string | null>(null);
    const [tagFilter, setTagFilter]               = useState<TagFilter>("all");
    const [activeTab, setActiveTab]               = useState<ActiveTab>("notes");
    const [editingEntry, setEditingEntry]         = useState<EntryToEdit | null>(null);

    const fetchEntries = useCallback(async () => {
        try {
            const url = new URL("/api/body", config.apiUri);
            const res = await fetch(url.toString());
            if (res.ok) setEntries(await res.json());
        } catch { /* network error */ }
    }, []);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    // ── Derived data ────────────────────────────────────────────────
    const metaMap = useMemo(() => {
        const map = new Map<string, MovementMeta>();
        entries
            .filter(e => e._meta)
            .forEach(e => {
                map.set(e.workoutName, {
                    id:          e.id ?? e._id,
                    workoutName: e.workoutName,
                    displayName: e.displayName || e.workoutName,
                    tag:         e.tag ?? null,
                    notes:       e.notes || "",
                    order:       e.order ?? 9999,
                });
            });
        return map;
    }, [entries]);

    const movements = useMemo(() => {
        const names = [...new Set(entries.filter(e => !e._meta).map(e => e.workoutName))];
        return names.sort((a, b) => (metaMap.get(a)?.order ?? 9999) - (metaMap.get(b)?.order ?? 9999));
    }, [entries, metaMap]);

    const filteredMovements = useMemo(() => {
        if (tagFilter === "all") return movements;
        return movements.filter(n => metaMap.get(n)?.tag === tagFilter);
    }, [movements, metaMap, tagFilter]);

    useEffect(() => {
        if (movements.length > 0 && selectedMovement === null) setSelectedMovement(movements[0]);
    }, [movements, selectedMovement]);

    const workoutEntries = useMemo(() => entries.filter(e => !e._meta), [entries]);

    const selectedEntries = useMemo(
        () => workoutEntries.filter(e => e.workoutName === selectedMovement),
        [workoutEntries, selectedMovement]
    );

    const lastLogEntry = useMemo(() => {
        const logs = selectedEntries
            .filter(e => e.weightUsed != null || e.repsCompleted != null || e.setsCompleted != null)
            .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
        return logs[0] ?? null;
    }, [selectedEntries]);

    const lastGoalEntry = useMemo(() => {
        const goals = selectedEntries
            .filter(e => e.setGoal != null || e.repGoal != null || e.weightGoal != null)
            .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
        return goals[0] ?? null;
    }, [selectedEntries]);

    const editingMeta = useMemo((): MovementMeta | null => {
        if (!editingMovement) return null;
        return metaMap.get(editingMovement) ?? {
            workoutName: editingMovement,
            displayName: editingMovement,
            tag:  null,
            notes: "",
            order: movements.indexOf(editingMovement),
        };
    }, [editingMovement, metaMap, movements]);

    // ── Delete movement ─────────────────────────────────────────────
    const handleDeleteMovement = useCallback(async (workoutName: string) => {
        const toDelete = entries.filter(e => e.workoutName === workoutName);
        await Promise.all(toDelete.map(e => {
            const id = e.id ?? e._id;
            if (!id) return Promise.resolve();
            const url = new URL("/api/body/remove_entry", config.apiUri);
            return fetch(url.toString(), {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ id }),
            });
        }));
        if (selectedMovement === workoutName) setSelectedMovement(null);
        setEditingMovement(null);
        fetchEntries();
    }, [entries, selectedMovement, fetchEntries]);

    // ── Delete single entry ─────────────────────────────────────────
    const handleDeleteEntry = useCallback(async (id: string) => {
        const url = new URL("/api/body/remove_entry", config.apiUri);
        await fetch(url.toString(), {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ id }),
        });
        fetchEntries();
    }, [fetchEntries]);

    // ── Reorder by name ─────────────────────────────────────────────
    const handleReorder = useCallback(async (name: string, direction: -1 | 1) => {
        const idx = movements.indexOf(name);
        const swapIdx = idx + direction;
        if (idx === -1 || swapIdx < 0 || swapIdx >= movements.length) return;

        const reordered = [...movements];
        [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

        await Promise.all(reordered.map(async (n, order) => {
            const meta = metaMap.get(n);
            if (meta?.id) {
                const url = new URL("/api/body/update_entry", config.apiUri);
                return fetch(url.toString(), {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ id: meta.id, order }),
                });
            } else {
                const url = new URL("/api/body/add_entry", config.apiUri);
                return fetch(url.toString(), {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({
                        workoutName: n, _meta: true,
                        displayName: n, tag: null, notes: "", order,
                        datetime: new Date().toISOString(),
                    }),
                });
            }
        }));
        fetchEntries();
    }, [movements, metaMap, fetchEntries]);

    // ── Styles ──────────────────────────────────────────────────────
    const ctrlBtn = "text-[10px] uppercase tracking-wide px-2 py-0.5 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors";
    const tabBtn  = (active: boolean) =>
        `text-xs uppercase tracking-wide px-3 py-1 border-b-2 transition-colors cursor-pointer ${
            active ? "border-nier-dark text-nier-text-dark" : "border-transparent text-nier-text-dark/40 hover:text-nier-text-dark"
        }`;

    return (
        <>
            <div className="relative nier-enter">
                <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
                <div className="relative bg-nier-100 border border-nier-150">

                    {/* Window title bar */}
                    <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                        <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Body</h3>
                        <button onClick={onClose} className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none">
                            ✕
                        </button>
                    </div>

                    <div className="p-4 flex flex-col gap-4">
                        <WorkoutGrid entries={workoutEntries} />

                        <div className="flex gap-4 flex-col md:flex-row">

                            {/* ── Movement list ── */}
                            <div className="relative shrink-0 w-full md:w-48 bg-nier-100-lighter flex flex-col">
                                <div className="h-7 bg-nier-150 flex items-center px-3">
                                    <span className="text-nier-text-dark text-sm">Movements</span>
                                </div>
                                <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />

                                {/* Tag filter */}
                                <div className="flex gap-1 px-3 py-1.5 border-b border-nier-150/40">
                                    {(["all", "upper", "lower"] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setTagFilter(f)}
                                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 cursor-pointer transition-colors ${
                                                tagFilter === f
                                                    ? "bg-nier-text-dark text-nier-100-lighter"
                                                    : "text-nier-text-dark/50 hover:text-nier-text-dark"
                                            }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>

                                {/* Draggable movement list */}
                                <div className="flex flex-col overflow-y-auto flex-1 min-h-0">
                                    {filteredMovements.length === 0 ? (
                                        <span className="text-nier-text-dark/40 text-xs uppercase px-3 py-3">
                                            {movements.length === 0 ? "No movements yet" : "None in this category"}
                                        </span>
                                    ) : filteredMovements.map((name) => {
                                        const meta = metaMap.get(name);
                                        const isSelected = selectedMovement === name;
                                        const fullIdx = movements.indexOf(name);
                                        return (
                                            <div
                                                key={name}
                                                className={`flex items-center gap-1.5 border-b border-nier-150/40 last:border-0 group transition-colors ${
                                                    isSelected ? "bg-nier-text-dark" : "hover:bg-nier-150/30"
                                                }`}
                                            >
                                                {/* Up/down buttons */}
                                                <div className="pl-1.5 flex flex-col shrink-0">
                                                    <button
                                                        onClick={() => handleReorder(name, -1)}
                                                        disabled={fullIdx === 0}
                                                        className={`text-[9px] leading-none cursor-pointer disabled:opacity-20 disabled:cursor-default ${isSelected ? "text-nier-100-lighter/60" : "text-nier-text-dark/50"}`}
                                                    >▲</button>
                                                    <button
                                                        onClick={() => handleReorder(name, 1)}
                                                        disabled={fullIdx === movements.length - 1}
                                                        className={`text-[9px] leading-none cursor-pointer disabled:opacity-20 disabled:cursor-default ${isSelected ? "text-nier-100-lighter/60" : "text-nier-text-dark/50"}`}
                                                    >▼</button>
                                                </div>

                                                {/* Name — click to select */}
                                                <button
                                                    onClick={() => setSelectedMovement(name)}
                                                    className={`flex-1 text-left text-xs uppercase tracking-wide py-2 ${isSelected ? "text-nier-100-lighter" : "text-nier-text-dark"}`}
                                                >
                                                    {meta?.displayName || name}
                                                </button>

                                                {/* Edit button */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); setEditingMovement(name); }}
                                                    className={`pr-2 text-sm cursor-pointer shrink-0 ${isSelected ? "text-nier-100-lighter/60" : "text-nier-text-dark/40"}`}
                                                >
                                                    ✎
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer */}
                                <div className="border-t border-nier-150/40 px-3 py-2">
                                    <button className={ctrlBtn} onClick={() => setModal("create")}>
                                        + New
                                    </button>
                                </div>
                            </div>

                            {/* ── Chart / Notes panel ── */}
                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                                {selectedMovement && (
                                    <div className="flex items-center justify-between">
                                        {/* Tabs */}
                                        <div className="flex">
                                            <button className={tabBtn(activeTab === "notes")}   onClick={() => setActiveTab("notes")}>Notes</button>
                                            <button className={tabBtn(activeTab === "chart")}   onClick={() => setActiveTab("chart")}>Chart</button>
                                            <button className={tabBtn(activeTab === "history")} onClick={() => setActiveTab("history")}>History</button>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button className={ctrlBtn} onClick={() => setModal("log")}>Log Workout</button>
                                            <button className={ctrlBtn} onClick={() => setModal("goals")}>Set Goals</button>
                                        </div>
                                    </div>
                                )}

                                {selectedMovement ? (
                                    activeTab === "chart" ? (
                                        <MovementChart
                                            name={metaMap.get(selectedMovement)?.displayName || selectedMovement}
                                            entries={selectedEntries}
                                        />
                                    ) : activeTab === "notes" ? (
                                        <div className="h-64 bg-nier-100-lighter border border-nier-150 relative">
                                            <div className="h-7 bg-nier-150 flex items-center px-3">
                                                <span className="text-nier-text-dark text-sm uppercase tracking-wide">
                                                    {metaMap.get(selectedMovement)?.displayName || selectedMovement}
                                                </span>
                                            </div>
                                            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />
                                            <div className="h-[calc(100%-1.75rem)] overflow-y-auto flex flex-col">
                                                {lastGoalEntry && (
                                                    <div className="px-4 py-3 border-b border-nier-150/40 flex items-center gap-6">
                                                        <span className="text-[9px] uppercase tracking-widest text-nier-text-dark/60 shrink-0">Goal</span>
                                                        {[
                                                            { label: "Sets",   val: lastGoalEntry.setGoal },
                                                            { label: "Reps",   val: lastGoalEntry.repGoal },
                                                            { label: "Weight", val: lastGoalEntry.weightGoal != null ? `${lastGoalEntry.weightGoal} lbs` : null },
                                                        ].map(({ label, val }) => val != null && (
                                                            <div key={label} className="flex flex-col items-center">
                                                                <span className="text-lg text-nier-text-dark leading-none">{val}</span>
                                                                <span className="text-[9px] uppercase tracking-widest text-nier-text-dark/60 mt-0.5">{label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="p-4 flex-1">
                                                    {metaMap.get(selectedMovement)?.notes ? (
                                                        <p className="text-sm text-nier-text-dark leading-relaxed whitespace-pre-wrap">
                                                            {metaMap.get(selectedMovement)!.notes}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-nier-text-dark/35 uppercase tracking-widest">
                                                            No notes — use ✎ to add some.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-64 bg-nier-100-lighter border border-nier-150 relative flex flex-col">
                                            <div className="h-7 bg-nier-150 flex items-center px-3 shrink-0">
                                                <span className="text-nier-text-dark text-sm uppercase tracking-wide">Entries</span>
                                            </div>
                                            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />
                                            <div className="overflow-y-auto flex-1">
                                                {(() => {
                                                    const logEntries = [...selectedEntries]
                                                        .filter(e => e.weightUsed != null || e.repsCompleted != null || e.setsCompleted != null || e.weightGoal != null || e.repGoal != null || e.setGoal != null)
                                                        .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
                                                    if (logEntries.length === 0) return (
                                                        <p className="text-xs text-nier-text-dark/35 uppercase tracking-widest px-3 py-3">No entries yet.</p>
                                                    );
                                                    return logEntries.map(e => {
                                                        const id = e.id ?? e._id;
                                                        const isGoal = e.weightGoal != null || e.repGoal != null || e.setGoal != null;
                                                        const parts: string[] = [];
                                                        if (!isGoal) {
                                                            if (e.setsCompleted != null) parts.push(`${e.setsCompleted} sets`);
                                                            if (e.repsCompleted != null) parts.push(`${e.repsCompleted} reps`);
                                                            if (e.weightUsed    != null) parts.push(`${e.weightUsed} lbs`);
                                                        } else {
                                                            const goalParts: string[] = [];
                                                            if (e.setGoal    != null) goalParts.push(`${e.setGoal} sets`);
                                                            if (e.repGoal    != null) goalParts.push(`${e.repGoal} reps`);
                                                            if (e.weightGoal != null) goalParts.push(`${e.weightGoal} lbs`);
                                                            if (goalParts.length) parts.push(`Goal: ${goalParts.join(", ")}`);
                                                        }
                                                        return (
                                                            <button
                                                                key={id ?? e.datetime}
                                                                onClick={() => id && setEditingEntry({ id, datetime: e.datetime, weightUsed: e.weightUsed, setsCompleted: e.setsCompleted, repsCompleted: e.repsCompleted, weightGoal: e.weightGoal, setGoal: e.setGoal, repGoal: e.repGoal })}
                                                                className="w-full flex items-center justify-between px-3 py-1.5 border-b border-nier-150/30 last:border-0 hover:bg-nier-150/30 text-left cursor-pointer transition-colors"
                                                            >
                                                                <span className="text-[10px] text-nier-text-dark/50 uppercase tracking-wide shrink-0">
                                                                    {new Date(e.datetime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                                                </span>
                                                                <span className={`text-xs ${isGoal ? "text-nier-text-dark/50 italic" : "text-nier-text-dark"}`}>
                                                                    {parts.join(" · ")}
                                                                </span>
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="h-64 bg-nier-100-lighter border border-nier-150 flex items-center justify-center">
                                        <span className="text-nier-text-dark/40 text-xs uppercase tracking-widest">Select a movement</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {modal && (
                <WorkoutModal
                    mode={modal}
                    movement={modal !== "create" ? selectedMovement ?? undefined : undefined}
                    lastEntry={lastLogEntry ?? undefined}
                    onClose={() => setModal(null)}
                    onSaved={fetchEntries}
                />
            )}

            {editingMeta && (
                <MovementEditModal
                    meta={editingMeta}
                    onClose={() => setEditingMovement(null)}
                    onSaved={fetchEntries}
                    onDelete={handleDeleteMovement}
                />
            )}

            {editingEntry && selectedMovement && (
                <EntryEditModal
                    entry={editingEntry}
                    movementName={metaMap.get(selectedMovement)?.displayName || selectedMovement}
                    onClose={() => setEditingEntry(null)}
                    onSaved={() => { fetchEntries(); setEditingEntry(null); }}
                    onDelete={id => { handleDeleteEntry(id); setEditingEntry(null); }}
                />
            )}
        </>
    );
};

export default BodyWindow;
