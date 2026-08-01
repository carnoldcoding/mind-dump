// One-time migration of Review dates to one canonical format: ISO.
//
//   npm run migrate:dates              # dry run — prints the plan, writes nothing
//   npm run migrate:dates -- --apply   # performs it
//
// Defaults to `date_completed`. Pass `--field release_date` for the other date
// a Review carries; both were written US-first and migrate identically.
//
// Run this against the tailnet hostname: reads are public, but /api/posts/update_post
// is gated (ADR-0001). Override with --api <url> or POSTS_API_URI.
//
// The npm script bundles this through esbuild first — the dev container is on
// Node 20, which can't run .ts directly.

import {
    planDateMigration,
    COMPLETION_DATE,
    RELEASE_DATE,
} from "../src/pages/System/components/ReviewPanel/migration.ts";
import type { DateField, DatePlan, ReviewDoc } from "../src/pages/System/components/ReviewPanel/migration.ts";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const apiFlag = args.indexOf("--api");
// No default. This rewrites documents in a database this app has no local copy
// of, so which server it points at is not a thing to be inferred — and
// config.ts can't be imported here anyway, since it reads import.meta.env.
const apiBase = (apiFlag !== -1 ? args[apiFlag + 1] : undefined) ?? process.env.POSTS_API_URI;
if (!apiBase) {
    console.error("\nno target: pass --api <url> or set POSTS_API_URI\n");
    process.exit(1);
}

const FIELDS: Record<string, DateField> = {
    date_completed: COMPLETION_DATE,
    release_date: RELEASE_DATE,
};

const fieldFlag = args.indexOf("--field");
const fieldName = fieldFlag !== -1 ? args[fieldFlag + 1] : "date_completed";
const field = FIELDS[fieldName];
if (!field) {
    console.error(`\nunknown field ${JSON.stringify(fieldName)}: expected one of ${Object.keys(FIELDS).join(", ")}\n`);
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

function report(plan: DatePlan) {
    console.log(apply ? "APPLYING\n" : "DRY RUN — no writes\n");

    if (plan.rewrites.length) {
        console.log(`  rewrite ${field.key} × ${plan.rewrites.length}`);
        for (const r of plan.rewrites) {
            console.log(`    ${r.from}  →  ${r.to}   ${r.title}`);
        }
    }

    const unreadable = plan.skipped.filter(s => s.reason === "unreadable");
    const unaddressable = plan.skipped.filter(s => s.reason === "no-slug");

    if (unreadable.length) {
        console.log(`\n  left alone — unreadable date × ${unreadable.length}`);
        for (const s of unreadable) console.log(`    ${JSON.stringify(s.value)}   ${s.title}`);
    }
    if (unaddressable.length) {
        console.log(`\n  left alone — no slug to write back to × ${unaddressable.length}`);
        for (const s of unaddressable) console.log(`    ${JSON.stringify(s.value)}   ${s.title}`);
    }

    if (plan.isEmpty) console.log("  nothing to do — already canonical");
    console.log("");
}

async function main() {
    const docs = await api<ReviewDoc[]>("/api/posts");
    console.log(`\nfetched ${docs.length} Reviews from ${apiBase}, migrating ${field.key}\n`);

    const plan = planDateMigration(docs, field);
    report(plan);

    if (!plan.rewrites.length) return;

    if (!apply) {
        console.log(`re-run with --apply to perform this. Only ${field.key} is written.\n`);
        return;
    }

    // update_post is a $set keyed by slug, so this sends the one field it
    // means to change rather than writing whole documents back.
    for (const r of plan.rewrites) {
        await api("/api/posts/update_post", { slug: r.slug, [field.key]: r.to });
        console.log(`  ~ ${r.to}  ${r.title}`);
    }

    console.log("\ndone\n");
}

main().catch(err => {
    console.error(`\nmigration failed: ${err.message}\n`);
    process.exit(1);
});
