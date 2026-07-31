---
status: accepted
---

# A Goal is current state on a Movement, not history

Body tracking stored goals as dated documents in the same `Body Data` collection as logged sets, distinguished only by which optional fields happened to be set — `weightGoal`/`repGoal`/`setGoal` rather than `weightUsed`/`repsCompleted`/`setsCompleted`. Every target ever set was kept forever.

Nothing ever read that history. `MovementChart` declared the three goal fields in its own `Entry` type and never plotted any of them. The notes panel sorted every goal document for a Movement by date purely to display the newest one. The only place the older goals surfaced at all was the History list, where they appeared as italic rows interleaved with actual performed sets — padding the one view whose job was to answer "what did I lift".

So the app paid for goal history in four places and spent it in none: a second modal mirroring the log form field-for-field, a discriminator on every document in the collection, a branch in the entry editor, and a History list that had to be read past.

We decided a Movement carries **one current Goal**, stored on the Movement record itself as `goal { sets, reps, weight }`. Setting a goal overwrites the previous one. Goals are edited in the Edit Movement form alongside display name, tag and notes — everything that defines a Movement in one place. The dated goal documents are deleted.

## What this costs

Target-over-time is now unaskable. There is no way to chart what you were aiming at in March against what you lifted in March, and no way to recover it later — the migration deletes those rows and `remove_entry` is a hard delete.

It also makes the chart's goal line mildly dishonest: because only the current Goal exists, the dashed reference renders flat across the entire history, as though 185 was always the target even for sets logged while aiming at 135. This is a known and accepted inaccuracy, not a bug to be filed.

Both were judged acceptable because the alternative was preserving, indefinitely, data that no view had ever displayed, in order to keep a feature nobody had asked for.

## Considered and rejected

- **Keep goals dated, plot them as a step line on the chart.** Would have made the history genuinely useful for the first time and kept the chart honest. Rejected because it preserves the two-modal split, the discriminator, and the History interleaving — it fixes the one thing that wasn't hurting while leaving all the things that were.
- **Goal as current state with a changelog.** Current goal on the Movement, past targets appended to an audit trail. Gets the single form and the clean History while keeping the data. Rejected as speculative storage: the changelog would have had no reader on day one, which is exactly the situation being escaped.
- **Tolerant reader, migrate nothing.** New code reads `meta.goal` when present and falls back to the newest goal document otherwise. Zero risk to existing data. Rejected because every reader carries the fallback branch forever and the old shapes never actually go away — the overloading would have survived the refactor meant to remove it.

## Consequences

- The entry classifier collapses from `meta | goal | log | null` to Movement versus Entry, told apart by an explicit flag rather than by inspecting which fields are set.
- A Movement becomes a stored record rather than a name derived from documents mentioning it. This is a direct consequence: the record now holds the Goal, so it has to exist in its own right. Creating a Movement writes one document instead of two, and deleting all of a Movement's Entries no longer destroys the Movement.
- `WorkoutModal`'s `goals` mode and `EntryEditModal`'s goal branch are deleted.
- A one-time migration script (`npm run migrate:body`) performs the fold and the deletes. It is dry-run by default. It classifies anything bearing logged values as a logged set regardless of what else it carries — deliberately unlike the app's old precedence, which ranked goal above log — because logged sets are the only documents here that cannot be reconstructed.
