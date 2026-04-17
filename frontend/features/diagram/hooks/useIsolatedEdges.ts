import { useMemo } from "react";
import type { RelationEdge } from "../types/flow.types";

/**
 * Returns `edges` unchanged when isolation is off, otherwise returns a copy
 * with every edge not connected to a selected node marked `hidden: true`.
 */
export function useIsolatedEdges(
    edges: RelationEdge[],
    selectedNodeIds: string[],
    enabled: boolean,
): RelationEdge[] {
    return useMemo(() => {
        if (!enabled || selectedNodeIds.length === 0) return edges;
        const selected = new Set(selectedNodeIds);
        return edges.map((edge) =>
            selected.has(edge.source) || selected.has(edge.target)
                ? edge
                : { ...edge, hidden: true },
        );
    }, [edges, enabled, selectedNodeIds]);
}
