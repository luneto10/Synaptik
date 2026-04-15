import { useCallback, useRef } from "react";
import type { EdgeChange, NodeChange } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import {
    beginDiagramHistoryGesture,
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
    historyPausedRef,
    withoutHistory,
} from "../store/diagramHistory";
import type { RelationEdge, TableNode } from "../types/flow.types";

type ChangeHandlersArgs = {
    onNodesChange?: (changes: NodeChange[]) => void;
    onEdgesChange?: (changes: EdgeChange[]) => void;
};

export function useFlowCanvasChangeHandlers({
    onNodesChange,
    onEdgesChange,
}: ChangeHandlersArgs) {
    const suppressNextRemovalsRef = useRef<{
        nodeIds: Set<string>;
        edgeIds: Set<string>;
    }>({ nodeIds: new Set(), edgeIds: new Set() });

    const handleBeforeDelete = useCallback(
        async ({
            nodes: nodesToRemove,
            edges: edgesToRemove,
        }: {
            nodes: TableNode[];
            edges: RelationEdge[];
        }): Promise<
            boolean | { nodes: TableNode[]; edges: RelationEdge[] }
        > => {
            if (nodesToRemove.length === 0) return true;
            endDiagramHistoryGestureIfActive();
            suppressNextRemovalsRef.current.nodeIds = new Set(
                nodesToRemove.map((n) => n.id),
            );
            suppressNextRemovalsRef.current.edgeIds = new Set(
                edgesToRemove.map((e) => e.id),
            );
            useDiagramStore
                .getState()
                .deleteTablesAtomic(nodesToRemove.map((n) => n.id));
            queueMicrotask(() => {
                suppressNextRemovalsRef.current.nodeIds.clear();
                suppressNextRemovalsRef.current.edgeIds.clear();
            });
            return false;
        },
        [],
    );

    const handleNodesChange = useCallback(
        (incomingChanges: NodeChange[]) => {
            let changes = incomingChanges;
            const suppressedNodeIds = suppressNextRemovalsRef.current.nodeIds;
            if (suppressedNodeIds.size > 0) {
                const filtered = changes.filter(
                    (c) => c.type !== "remove" || !suppressedNodeIds.has(c.id),
                );
                if (filtered.length === 0) return;
                changes = filtered;
            }

            // Pure selection changes must not create history entries
            if (changes.every((c) => c.type === "select")) {
                withoutHistory(() => onNodesChange?.(changes));
                return;
            }

            // Passive dimension updates (initial measurement) — never recorded
            const isPassiveDimensionsOnly =
                changes.length > 0 &&
                changes.every(
                    (c) =>
                        c.type === "dimensions" &&
                        (!("resizing" in c) ||
                            (c as NodeChange & { resizing?: boolean }).resizing ===
                                undefined),
                );
            if (isPassiveDimensionsOnly && !historyPausedRef.current) {
                withoutHistory(() => onNodesChange?.(changes));
                return;
            }

            const isDragging = changes.some(
                (c) => c.type === "position" && c.dragging === true,
            );
            const isResizing = changes.some(
                (c) =>
                    c.type === "dimensions" &&
                    "resizing" in c &&
                    c.resizing === true,
            );
            const isDropped = changes.some(
                (c) => c.type === "position" && c.dragging === false,
            );
            const isResizeEnd = changes.some(
                (c) =>
                    c.type === "dimensions" &&
                    "resizing" in c &&
                    c.resizing === false,
            );

            if (isDragging || isResizing) {
                if (!historyPausedRef.current) {
                    // Apply BEFORE pausing so this first change records the pre-gesture state.
                    onNodesChange?.(changes);
                    beginDiagramHistoryGesture();
                    return;
                }
                onNodesChange?.(changes);
                return;
            }

            // Final event of a drag / resize — apply while the gesture is still paused
            // (so this change is NOT a separate history entry), then commit.
            // For drops specifically, also re-normalize edge handles so that moving a node
            // past another one auto-flips the arrow direction — all in the same undo step.
            if (isDropped || isResizeEnd) {
                onNodesChange?.(changes);
                if (isDropped) useDiagramStore.getState().normalizeEdgeHandleDirections();
                endDiagramHistoryGestureIfActive();
                return;
            }

            onNodesChange?.(changes);
        },
        [onNodesChange],
    );

    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const suppressedEdgeIds = suppressNextRemovalsRef.current.edgeIds;
            if (suppressedEdgeIds.size > 0) {
                const filtered = changes.filter(
                    (c) => c.type !== "remove" || !suppressedEdgeIds.has(c.id),
                );
                if (filtered.length === 0) return;
                changes = filtered;
            }
            // Pure edge-selection changes must not create history entries
            if (changes.every((c) => c.type === "select")) {
                withoutHistory(() => onEdgesChange?.(changes));
                return;
            }
            onEdgesChange?.(changes);
        },
        [onEdgesChange],
    );

    const handleNodeDragStart = useCallback(() => {
        // End any lingering gesture from a previous drag before starting a new one.
        endDiagramHistoryGestureIfActive();
    }, []);

    const handleNodeDragStop = useCallback(() => {
        // Deferred fallback: ends the gesture if React Flow never emits dragging:false.
        endDiagramHistoryGestureDeferred();
    }, []);

    const handleSelectionDragStart = useCallback(() => {
        endDiagramHistoryGestureIfActive();
    }, []);

    const handleSelectionDragStop = useCallback(() => {
        // Deferred fallback only — gesture is normally ended inside handleNodesChange.
        endDiagramHistoryGestureDeferred();
    }, []);

    return {
        handleBeforeDelete,
        handleNodesChange,
        handleEdgesChange,
        handleNodeDragStart,
        handleNodeDragStop,
        handleSelectionDragStart,
        handleSelectionDragStop,
    };
}
