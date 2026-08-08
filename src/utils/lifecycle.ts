// When a Review's Status changes, which dates that stamps.
//
// One definition, because the stamping happens in more than one place — the
// editor's Status field and the Backlog's Start and Finish controls — and
// every rule this repo has written twice has drifted.

import { todayIso } from './completionDate';

/** The date fields a transition writes. Empty when it writes none. */
export type TransitionDates = {
    date_started?: string;
    date_completed?: string;
};

/**
 * The dates to merge onto a Review whose Status is changing.
 *
 * Keyed on the transition rather than the destination, so re-saving something
 * that is already `active` does not restamp the day it started. Entering a
 * state is the event worth recording; being in one is not.
 */
export function datesForTransition(from: string | undefined, to: string): TransitionDates {
    if (from === to) return {};

    if (to === 'active') return { date_started: todayIso() };
    if (to === 'done') return { date_completed: todayIso() };

    // Going back to `todo` is not an event worth a date. Returning nothing
    // also leaves whatever is already recorded alone — this says what to
    // write, and writing nothing is not the same as clearing.
    return {};
}
