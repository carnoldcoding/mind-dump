// Fails when a change adds lint errors, rather than when any exist.
//
// This codebase carries 77 eslint errors it has always carried — mostly
// `any` in files written before the types settled. Gating on zero would mean
// every pull request failed on day one for reasons that have nothing to do
// with it, and a check that always fails is a check nobody reads.
//
// So the gate is a budget: the committed number in .eslint-budget is what the
// repo is known to have, and CI fails if a branch exceeds it. Coming in under
// budget is a pass, and says so — lower the file when that happens, and the
// budget only ever ratchets down.
//
//   node scripts/lint-budget.mjs          # check against the budget
//   node scripts/lint-budget.mjs --update # write the current count as the budget

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BUDGET_FILE = new URL('../.eslint-budget', import.meta.url);

function countErrors() {
    // eslint exits non-zero when it finds anything, which is the normal case
    // here — the count is what matters, not the exit status.
    let raw;
    try {
        raw = execFileSync('npx', ['eslint', '.', '-f', 'json'], {
            encoding: 'utf8',
            maxBuffer: 32 * 1024 * 1024,
        });
    } catch (error) {
        raw = error.stdout;
        if (!raw) throw error;
    }
    return JSON.parse(raw).reduce((total, file) => total + file.errorCount, 0);
}

const actual = countErrors();

if (process.argv.includes('--update')) {
    writeFileSync(BUDGET_FILE, `${actual}\n`);
    console.log(`lint budget set to ${actual}`);
    process.exit(0);
}

if (!existsSync(BUDGET_FILE)) {
    console.error('no .eslint-budget — run: node scripts/lint-budget.mjs --update');
    process.exit(1);
}

const budget = Number(readFileSync(BUDGET_FILE, 'utf8').trim());

if (actual > budget) {
    console.error(
        `\n✗ ${actual} lint errors, budget is ${budget} — this branch adds ${actual - budget}.\n` +
        `  Fix them, or if they are genuinely pre-existing, say why in the PR.\n`,
    );
    process.exit(1);
}

if (actual < budget) {
    console.log(
        `\n✓ ${actual} lint errors, under the budget of ${budget}.\n` +
        `  Lower it: node scripts/lint-budget.mjs --update\n`,
    );
    process.exit(0);
}

console.log(`✓ ${actual} lint errors, at budget.`);
