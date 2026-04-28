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
    const selected = useMemo(
        () => new Set(selectedNodeIds),
        [selectedNodeIds],
    );

    return useMemo(() => {
        if (!enabled || selected.size === 0) return edges;

        let next: RelationEdge[] | null = null;
        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];
            const shouldHide = !(
                selected.has(edge.source) || selected.has(edge.target)
            );
            if (shouldHide === !!edge.hidden) continue;
            if (!next) next = edges.slice();
            next[i] = { ...edge, hidden: shouldHide };
        }

        return next ?? edges;
    }, [edges, enabled, selected]);
}
