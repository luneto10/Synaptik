import type { TableNode, RelationEdge } from "../types/flow.types";
import { handleIds } from "./handleIds";

/**
 * Returns column-level source/target handle IDs based on relative node positions.
 * This is used when creating new edges to ensure they start on the correct side.
 */
export function columnHandles(
    sourceColId: string,
    targetColId: string,
    sourceNodeId: string,
    targetNodeId: string,
    nodes: TableNode[],
) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const src = byId.get(sourceNodeId);
    const tgt = byId.get(targetNodeId);
    const sourceOnLeft = !src || !tgt || src.position.x <= tgt.position.x;
    return {
        sourceHandle: sourceOnLeft
            ? handleIds(sourceColId).sourceRight
            : handleIds(sourceColId).sourceLeft,
        targetHandle: sourceOnLeft
            ? handleIds(targetColId).targetLeft
            : handleIds(targetColId).targetRight,
    };
}

/**
 * Normalizes edge handles based on the relative horizontal positions of the
 * source and target nodes. This ensures that edges always connect to the
 * nearest sides of the nodes (e.g., right side if source is to the left of target).
 */
export function normalizeEdgeHandles(
    nodes: TableNode[],
    edges: RelationEdge[],
): RelationEdge[] {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((e) => {
        const sourceNode = byId.get(e.source);
        const targetNode = byId.get(e.target);
        const sourceColId = e.data?.sourceColumnId;
        const targetColId = e.data?.targetColumnId;

        if (!sourceNode || !targetNode || !sourceColId || !targetColId) return e;

        const { sourceHandle, targetHandle } = columnHandles(
            sourceColId,
            targetColId,
            e.source,
            e.target,
            nodes,
        );

        return {
            ...e,
            sourceHandle,
            targetHandle,
        };
    });
}
