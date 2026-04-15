import { useDiagramStore } from "./diagramStore";

/**
 * True while a geometry interaction (drag, selection-drag, resize) is mutating the
 * store with temporal tracking paused. Mirrors zundo pause for FlowCanvas branching.
 */
export const historyPausedRef = { current: false };

let geometrySessionActive = false;

function syncHistoryPausedRef() {
    historyPausedRef.current = geometrySessionActive;
}

/**
 * Pause temporal history once per geometry session (idempotent).
 */
export function beginDiagramHistoryGesture() {
    if (geometrySessionActive) return;
    geometrySessionActive = true;
    useDiagramStore.temporal.getState().pause();
    syncHistoryPausedRef();
}

/**
 * Resume temporal history when a geometry session ends (idempotent).
 */
export function endDiagramHistoryGesture() {
    if (!geometrySessionActive) return;
    geometrySessionActive = false;
    useDiagramStore.temporal.getState().resume();
    syncHistoryPausedRef();
}

export function endDiagramHistoryGestureIfActive() {
    endDiagramHistoryGesture();
}

/** Fallback when React Flow does not emit a final `dragging: false` / resize-end change. */
export function endDiagramHistoryGestureDeferred() {
    queueMicrotask(() => {
        endDiagramHistoryGestureIfActive();
    });
}

export function isDiagramHistoryGestureActive() {
    return geometrySessionActive;
}

/** Test / dialog / unmount helper — clears session and resumes tracking. */
export function resetDiagramHistoryGestureDepthForTests() {
    geometrySessionActive = false;
    useDiagramStore.temporal.getState().resume();
    syncHistoryPausedRef();
}
