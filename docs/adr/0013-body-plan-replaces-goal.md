---
status: accepted
---

# Body is built on a Plan; a Movement has a Rule, not a Goal

This supersedes [ADR-0002](./0002-goal-as-movement-state.md).

Body stored a Movement, one Goal on it, and Entries logged against it. It recorded what was done. It
did not say what to do on a given day, and it did not show a day that was missed. Production held 6
Movements and 0 Entries when this was decided: the list was set up on 2026-08-26 and no set was ever
logged against it.

We decided that Body starts from a **Plan**. The Plan maps a weekday to a **Workout**. A Workout is an
ordered list of Movements. A **Session** is one Workout done on one date, and a **Set** is one logged
set inside a Session.

## The Goal is removed

A Goal was a fixed target of sets, reps and weight. The training method this app now serves takes a
set past failure: full reps, then partial reps, then assisted reps. A set like that has no rep
target. The target is to beat the last Session.

So a Movement carries a **Rule** (past failure, failure only, or no failure) and a set count. The
Session screen shows the Sets of the last Session beside the fields, and that is the number to beat.
The chart has no target line. The flat Goal line that ADR-0002 called "mildly dishonest" is gone
with the Goal.

## A Set belongs to a Session

The old Entry was a loose record against a Movement. Nothing tied two Entries of one evening
together. A Set now sits inside a dated Session document, so the app knows which Workout it was part
of. That is what lets it answer "was Upper A done this week".

## One collection for each kind of record

`Body Data` held Movements and Entries in one collection, told apart by a `_meta` flag, and the
backend stored any field it was sent. The five collections that replace it each hold one kind:
`Body Plan`, `Body Movements`, `Body Sessions`, `Body Routine Checks`, `Body Weigh-ins`. The backend
names the fields each write accepts and refuses any other.

## What this costs

- **The old data model has no migration.** Both databases were emptied before the rework, and the
  backup of the 6 Movements is not read by any code. This was acceptable only because no Entry
  existed.
- **The Plan has four Workouts and no more.** The four keys are fixed in the backend. A fifth
  Workout, or a second Plan, is a code change. The split is expected to change rarely.
- **The grid reads past weeks against the current Plan.** A Workout that moves from Thursday to
  Wednesday moves in every past row of the grid. No history of the Plan is kept, for the reason
  ADR-0002 gave against a Goal changelog: it would have no reader.

## Considered and rejected

- **Keep Movement, Goal and Entry, and add a Plan beside them.** Rejected because the Goal has no
  meaning for a set past failure, and an Entry with no Session cannot say which Workout it was part
  of.
- **A rolling order with no fixed weekdays**: the next Workout in sequence is always due. It never
  shows a miss. Rejected because the user chose fixed weekdays, and a miss that is never shown is a
  miss that is never seen.
- **Compute the summary in the browser.** Rejected because the backend is where pure logic is
  tested in this pair of repos, and the summary (the grid, the missed Workouts, the 7-day average,
  the best Set) is all pure logic.

## Consequences

- A missed Workout is offered again on any later day of its week and not after. A week runs Monday
  to Sunday.
- A Movement with Sets cannot be deleted. It can only be removed from a Workout, and its history
  stays.
- The full design, with the sources behind the training content, is in
  `specs/mind-dump-body-plan.md` in the parent folder of this repo.
