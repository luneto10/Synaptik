import { useMemo } from "react";
import type { RelationEdge } from "../types/flow.types";

/**
 * Returns `edges` unchanged when isolation is off. When on, returns an array
 * where edges not connected to any selected node are marked `hidden: true`.
 * Edges whose `hidden` flag would not change keep their original reference,
 * so ReactFlow's edge reconciliation stays cheap even on large diagrams.
 */
export function useIsolatedEdges(
    edges: RelationEdge[],
    selectedNodeIds: string[],
    enabled: boolean,
): RelationEdge[] {
    return useMemo(() => {
        if (!enabled || selectedNodeIds.length === 0) return edges;
        const selected = new Set(selectedNodeIds);
        let changed = false;
        const next = edges.map((edge) => {
            const shouldHide = !(
                selected.has(edge.source) || selected.has(edge.target)
            );
            if (shouldHide === !!edge.hidden) return edge;
            changed = true;
            return { ...edge, hidden: shouldHide };
        });
        return changed ? next : edges;
    }, [edges, enabled, selectedNodeIds]);
}
