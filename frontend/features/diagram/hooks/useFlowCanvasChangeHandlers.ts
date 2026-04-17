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

type NodeChangePhase =
    | "selection-only"
    | "passive-dims"
    | "gesture-start"
    | "gesture-continue"
    | "gesture-end"
    | "other";

function hasResizingFlag(c: NodeChange): c is NodeChange & { resizing: boolean } {
    return c.type === "dimensions" && "resizing" in c;
}

/**
 * Classify a batch of node changes into a single phase — one place to reason
 * about React Flow's change types. Keeps the handler top-down.
 */
function classifyNodeChanges(changes: NodeChange[]): NodeChangePhase {
    if (changes.length === 0) return "other";
    if (changes.every((c) => c.type === "select")) return "selection-only";

    const isPassiveDimsOnly = changes.every(
        (c) => c.type === "dimensions" && !("resizing" in c),
    );
    if (isPassiveDimsOnly) return "passive-dims";

    const dragging = changes.some(
        (c) => c.type === "position" && c.dragging === true,
    );
    const resizing = changes.some((c) => hasResizingFlag(c) && c.resizing === true);
    if (dragging || resizing) {
        return historyPausedRef.current ? "gesture-continue" : "gesture-start";
    }

    const dropped = changes.some(
        (c) => c.type === "position" && c.dragging === false,
    );
    const resizeEnd = changes.some(
        (c) => hasResizingFlag(c) && c.resizing === false,
    );
    if (dropped || resizeEnd) return "gesture-end";

    return "other";
}

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
        }): Promise<boolean | { nodes: TableNode[]; edges: RelationEdge[] }> => {
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
            const suppressedNodeIds = suppressNextRemovalsRef.current.nodeIds;
            let changes = incomingChanges;
            if (suppressedNodeIds.size > 0) {
                changes = changes.filter(
                    (c) => c.type !== "remove" || !suppressedNodeIds.has(c.id),
                );
                if (changes.length === 0) return;
            }

            const phase = classifyNodeChanges(changes);

            switch (phase) {
                case "selection-only":
                case "passive-dims":
                    withoutHistory(() => onNodesChange?.(changes));
                    return;

                case "gesture-start":
                    // Apply BEFORE pausing so the first change records pre-gesture state.
                    onNodesChange?.(changes);
                    beginDiagramHistoryGesture();
                    return;

                case "gesture-end":
                    // Apply while gesture is still paused — this change is not a separate
                    // history entry. Re-normalise handle directions on drop so moving a
                    // node past another auto-flips arrows in the same undo step.
                    onNodesChange?.(changes);
                    if (
                        changes.some(
                            (c) => c.type === "position" && c.dragging === false,
                        )
                    ) {
                        useDiagramStore.getState().normalizeEdgeHandleDirections();
                    }
                    endDiagramHistoryGestureIfActive();
                    return;

                case "gesture-continue":
                case "other":
                default:
                    onNodesChange?.(changes);
                    return;
            }
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
            if (changes.every((c) => c.type === "select")) {
                withoutHistory(() => onEdgesChange?.(changes));
                return;
            }
            onEdgesChange?.(changes);
        },
        [onEdgesChange],
    );

    const handleNodeDragStart = useCallback(() => {
        endDiagramHistoryGestureIfActive();
    }, []);

    const handleNodeDragStop = useCallback(() => {
        endDiagramHistoryGestureDeferred();
    }, []);

    const handleSelectionDragStart = useCallback(() => {
        endDiagramHistoryGestureIfActive();
    }, []);

    const handleSelectionDragStop = useCallback(() => {
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
