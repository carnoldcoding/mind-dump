/**
 * jsdom implements neither `AnimationEvent` nor `TransitionEvent`. React
 * decides which native event name to bind at module-import time by asking
 * whether `AnimationEvent` exists on `window` — when it doesn't, React falls
 * back to the vendor-prefixed `webkitAnimationEnd`, and a test firing
 * `animationend` (what every real browser dispatches) silently reaches no
 * handler at all.
 *
 * That fallback is invisible and would quietly make every animationend-driven
 * assertion vacuous, so we install the constructor here rather than teaching
 * the tests to fire a prefixed name the app will never see in production.
 * This must run in `setupFiles`, before React is imported.
 */
if (typeof window !== 'undefined' && !('AnimationEvent' in window)) {
  class AnimationEventPolyfill extends Event {
    readonly animationName: string;
    readonly elapsedTime: number;
    readonly pseudoElement: string;

    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init);
      this.animationName = init.animationName ?? '';
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? '';
    }
  }

  // Cast through a record: the `in` check above narrows `window` to a type
  // that, by construction, lacks the very property we are installing.
  const target = globalThis as unknown as Record<string, unknown>;
  target.AnimationEvent = AnimationEventPolyfill;
}
