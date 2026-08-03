// When a Review was captured.
//
// There is no `createdAt` on a Review. There is, however, a Mongo ObjectId,
// and Mongo builds one out of a 4-byte unix timestamp followed by 8 bytes of
// machine and counter — so the moment a record was first written is already in
// every response, in the id the app is fetching anyway.
//
// This is the only place in the frontend that knows that. It is a real
// coupling to the database's id format and worth naming as one: if a proper
// `createdAt` field ever lands, the body of `capturedAt` changes to read it and
// nothing else in the app moves.

/** 8 hex characters of timestamp, then 16 of machine and counter. */
const OBJECT_ID = /^[0-9a-f]{24}$/i;

/**
 * The moment a record was created, or `undefined` where the id is not one
 * Mongo made.
 *
 * Absence rather than an Invalid Date: the Backlog renders what this returns,
 * and an Invalid Date arrives on screen as the literal text `NaN`. Test
 * fixtures across this repo use ids like `id-Nioh`, so unreadable ids are a
 * normal case rather than a corrupt one.
 */
export function capturedAt(id: string): Date | undefined {
    if (!OBJECT_ID.test(id)) return undefined;
    return new Date(parseInt(id.slice(0, 8), 16) * 1000);
}

/**
 * Whole days between capture and `now`, or `undefined` where the id carries no
 * date to count from.
 *
 * Floored, so the day something was captured reads 0 rather than 1 — "waiting
 * 1d" on something added an hour ago would be the figure lying on its first
 * day, which is the day you are most likely to be looking at it.
 */
export function daysWaiting(id: string, now: Date = new Date()): number | undefined {
    const captured = capturedAt(id);
    if (!captured) return undefined;
    return Math.max(0, Math.floor((now.getTime() - captured.getTime()) / 86_400_000));
}
