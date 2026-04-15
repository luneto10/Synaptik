import { useDiagramStore } from "./diagramStore";

/** True while a drag/resize gesture is active and temporal tracking is paused. */
export const historyPausedRef = { current: false };

let gestureActive = false;

/** Pause temporal history at the start of a drag/resize gesture (idempotent). */
export function beginDiagramHistoryGesture() {
    if (gestureActive) return;
    gestureActive = true;
    historyPausedRef.current = true;
    useDiagramStore.temporal.getState().pause();
}

/** Resume temporal history at the end of a drag/resize gesture (idempotent). */
export function endDiagramHistoryGesture() {
    if (!gestureActive) return;
    gestureActive = false;
    historyPausedRef.current = false;
    useDiagramStore.temporal.getState().resume();
}

// Alias kept for all existing call sites.
export const endDiagramHistoryGestureIfActive = endDiagramHistoryGesture;

/** Deferred end — fallback when React Flow misses a final drag/resize event. */
export function endDiagramHistoryGestureDeferred() {
    queueMicrotask(endDiagramHistoryGesture);
}

/**
 * Apply `fn` without recording a history entry.
 * Useful for selection, passive dimension updates, and other non-semantic mutations.
 */
export function withoutHistory(fn: () => void) {
    const t = useDiagramStore.temporal.getState();
    t.pause();
    try { fn(); } finally { t.resume(); }
}

/** Test / dialog / unmount helper — hard-resets gesture state. */
export function resetDiagramHistoryGestureDepthForTests() {
    gestureActive = false;
    historyPausedRef.current = false;
    useDiagramStore.temporal.getState().resume();
}
