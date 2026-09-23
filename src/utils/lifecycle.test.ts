import { describe, expect, it } from 'vitest';
import { datesForTransition } from './lifecycle';
import { todayIso } from './completionDate';

describe('the dates a Status change stamps', () => {
    it('records when work started', () => {
        expect(datesForTransition('todo', 'active')).toEqual({ date_started: todayIso() });
    });

    it('records when work finished', () => {
        expect(datesForTransition('active', 'done')).toEqual({ date_completed: todayIso() });
    });

    // Keyed on the transition, not the destination. Saving an edit to
    // something already started must not move the day it started, or "playing
    // 6d" resets to zero every time a genre is corrected.
    it('stamps nothing when the Status has not changed', () => {
        expect(datesForTransition('active', 'active')).toEqual({});
        expect(datesForTransition('done', 'done')).toEqual({});
        expect(datesForTransition('todo', 'todo')).toEqual({});
    });

    // A Review captured before this field existed has no previous Status the
    // first time it is touched. Treating that as a change is right: it is
    // entering the state as far as anything recorded knows.
    it('stamps when there is no previous Status', () => {
        expect(datesForTransition(undefined, 'active')).toEqual({ date_started: todayIso() });
        expect(datesForTransition(undefined, 'done')).toEqual({ date_completed: todayIso() });
    });

    // Un-starting clears the start date: an unstarted item must not carry one,
    // or "Started 30d" keeps counting work that was dropped. An empty string is
    // the written clear (the backend $sets it), not an absence.
    it('clears the start date when un-starting', () => {
        expect(datesForTransition('active', 'todo')).toEqual({ date_started: '' });
        expect(datesForTransition('done', 'todo')).toEqual({ date_started: '' });
    });

    // Picking a finished Review back up is a new run, not an undo — a second
    // playthrough should read "playing 3d", not the date of the first one.
    it('restamps a finished Review picked back up', () => {
        expect(datesForTransition('done', 'active')).toEqual({ date_started: todayIso() });
    });

    // Restarting something abandoned is a new run, and "playing 3d" should
    // mean this run rather than the one given up on last year.
    it('restamps a restart', () => {
        expect(datesForTransition('todo', 'active')).toEqual({ date_started: todayIso() });
    });

    it('stamps one date per transition, never both', () => {
        for (const [from, to] of [['todo', 'active'], ['active', 'done'], ['todo', 'done']] as const) {
            expect(Object.keys(datesForTransition(from, to))).toHaveLength(1);
        }
    });
});
