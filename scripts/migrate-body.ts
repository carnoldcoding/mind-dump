// One-time migration from the legacy Body Data shapes to Movement-as-record.
//
//   npm run migrate:body              # dry run — prints the plan, writes nothing
//   npm run migrate:body -- --apply   # performs it
//
// Run this against the tailnet hostname, since /api/body is gated (ADR-0001).
// Override with --api <url> or BODY_API_URI.
//
// The npm script bundles this through esbuild first — the dev container is on
// Node 20, which can't run .ts directly.

import { planMigration } from "../src/pages/System/components/Body/migration.ts";
import type { LegacyDoc, MigrationPlan } from "../src/pages/System/components/Body/migration.ts";
import { describeGoal } from "../src/pages/System/components/Body/entry.ts";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const apiFlag = args.indexOf("--api");
// No default. This deletes documents, so which server it points at is not a
// thing to be inferred — and config.ts can't be imported here anyway, since
// it reads import.meta.env.
const apiBase = (apiFlag !== -1 ? args[apiFlag + 1] : undefined) ?? process.env.BODY_API_URI;
if (!apiBase) {
    console.error("\nno target: pass --api <url> or set BODY_API_URI\n");
    process.exit(1);
}

async function api<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(new URL(path, apiBase), {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${body ? "POST" : "GET"} ${path} failed (${res.status})`);
    return res.json() as Promise<T>;
}

const goalText = (goal: Parameters<typeof describeGoal>[0]) => describeGoal(goal) ?? "no goal";

function report(plan: MigrationPlan) {
    console.log(apply ? "APPLYING\n" : "DRY RUN — no writes\n");

    if (plan.backfill.length) {
        console.log(`  backfill Movement record × ${plan.backfill.length}`);
        for (const b of plan.backfill) console.log(`    ${b.workoutName}  (${goalText(b.goal)})`);
    }
    if (plan.setGoal.length) {
        console.log(`  fold goal into Movement × ${plan.setGoal.length}`);
        for (const g of plan.setGoal) console.log(`    ${g.workoutName}  ${goalText(g.goal)}`);
    }

    const stale = plan.deletions.filter(d => d.reason === "stale-goal");
    const phantoms = plan.deletions.filter(d => d.reason === "phantom");
    if (stale.length) console.log(`  delete superseded goal rows × ${stale.length}`);
    if (phantoms.length) console.log(`  delete placeholder rows × ${phantoms.length}`);

    if (plan.isEmpty) console.log("  nothing to do — already migrated");
    console.log("");
}

async function main() {
    const docs = await api<LegacyDoc[]>("/api/body");
    console.log(`\nfetched ${docs.length} documents from ${apiBase}\n`);

    const plan = planMigration(docs);
    report(plan);

    if (plan.isEmpty) return;

    if (!apply) {
        console.log("re-run with --apply to perform this. Logged sets are never touched.\n");
        return;
    }

    // Writes before deletes: a failure partway through must never leave a goal
    // deleted but not yet folded into its Movement.
    for (const b of plan.backfill) {
        await api("/api/body/add_entry", {
            workoutName: b.workoutName,
            _meta: true,
            displayName: b.displayName,
            tag: b.tag,
            notes: b.notes,
            order: b.order,
            goal: b.goal,
            datetime: new Date().toISOString(),
        });
        console.log(`  + Movement ${b.workoutName}`);
    }
    for (const g of plan.setGoal) {
        await api("/api/body/update_entry", { id: g.id, goal: g.goal });
        console.log(`  ~ goal ${g.workoutName}`);
    }
    for (const d of plan.deletions) {
        await api("/api/body/remove_entry", { id: d.id });
        console.log(`  - ${d.reason} ${d.workoutName}`);
    }

    console.log("\ndone\n");
}

main().catch(err => {
    console.error(`\nmigration failed: ${err.message}\n`);
    process.exit(1);
});
