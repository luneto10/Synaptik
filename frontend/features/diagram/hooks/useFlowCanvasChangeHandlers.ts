import { useCallback, useRef } from "react";
import type { EdgeChange, NodeChange } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import {
    beginDiagramHistoryGesture,
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
    historyPausedRef,
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
                const temporal = useDiagramStore.temporal.getState();
                temporal.pause();
                onNodesChange?.(changes);
                temporal.resume();
                return;
            }

            const isDragging = changes.some(
                (c) => c.type === "position" && c.dragging === true,
            );
            const isDropped = changes.some(
                (c) => c.type === "position" && c.dragging === false,
            );
            const isResizing = changes.some(
                (c) =>
                    c.type === "dimensions" &&
                    "resizing" in c &&
                    c.resizing === true,
            );
            const isResizeEnd = changes.some(
                (c) =>
                    c.type === "dimensions" &&
                    "resizing" in c &&
                    c.resizing === false,
            );

            if (isDragging || isResizing) {
                if (!historyPausedRef.current) {
                    onNodesChange?.(changes);
                    beginDiagramHistoryGesture();
                    return;
                }
                onNodesChange?.(changes);
                return;
            }

            if (isDropped || isResizeEnd) {
                onNodesChange?.(changes);
                return;
            }

            if (historyPausedRef.current) {
                onNodesChange?.(changes);
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
            onEdgesChange?.(changes);
        },
        [onEdgesChange],
    );

    const handleNodeDragStart = useCallback(() => {
        endDiagramHistoryGestureIfActive();
    }, []);

    const handleNodeDragStop = useCallback(() => {
        endDiagramHistoryGestureIfActive();
        endDiagramHistoryGestureDeferred();
    }, []);

    const handleSelectionDragStart = useCallback(() => {
        endDiagramHistoryGestureIfActive();
    }, []);

    const handleSelectionDragStop = useCallback(() => {
        endDiagramHistoryGestureIfActive();
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
