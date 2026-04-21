import { useDiagramStore } from "./diagramStore";
import { EDGE_STYLE, LAYOUT } from "../constants";
import type { DiagramNode, RelationEdge, TableNode } from "../types/flow.types";
import { isTableNode } from "../types/flow.types";

type NodeBounds = { x0: number; x1: number; y0: number; y1: number };

// Single-entry cache keyed on the (allNodes, edges) reference pair. Keying on
// the full allNodes array (not a filtered slice) preserves immer's structural
// sharing so the cache hits on every subsequent edge subscription within the
// same store snapshot, reducing recomputation from O(E) to O(1) per snapshot.
let cachedAllNodes: DiagramNode[] | null = null;
let cachedEdges: RelationEdge[] | null = null;
let cachedOffsets: Map<string, number> | null = null;

export function computeEdgeOffsets(
    allNodes: DiagramNode[],
    edges: RelationEdge[],
): Map<string, number> {
    if (cachedOffsets && allNodes === cachedAllNodes && edges === cachedEdges) {
        return cachedOffsets;
    }

    const nodes = allNodes.filter(isTableNode);
    const nodeById = new Map<string, TableNode>();
    const boundsById = new Map<string, NodeBounds>();
    for (const n of nodes) {
        nodeById.set(n.id, n);
        const w = n.measured?.width ?? LAYOUT.DEFAULT_NODE_WIDTH;
        const h = n.measured?.height ?? LAYOUT.DEFAULT_NODE_HEIGHT;
        boundsById.set(n.id, {
            x0: n.position.x,
            x1: n.position.x + w,
            y0: n.position.y,
            y1: n.position.y + h,
        });
    }

    // Group edges by source so sibling lane computation is O(edgesOnSource)
    // instead of O(allEdges) per edge.
    const edgesBySource = new Map<string, RelationEdge[]>();
    for (const e of edges) {
        const arr = edgesBySource.get(e.source);
        if (arr) arr.push(e);
        else edgesBySource.set(e.source, [e]);
    }

    const offsets = new Map<string, number>();
    for (const edge of edges) {
        const sourceNode = nodeById.get(edge.source);
        const targetNode = nodeById.get(edge.target);
        if (!sourceNode || !targetNode) {
            offsets.set(edge.id, EDGE_STYLE.baseOffset);
            continue;
        }

        const currentDirection: "left" | "right" =
            sourceNode.position.x <= targetNode.position.x ? "right" : "left";

        const groupSiblings = edgesBySource.get(edge.source) ?? [];
        const sameDirTargets: { id: string; y: number }[] = [];
        for (const sib of groupSiblings) {
            if (sib.id === edge.id) continue;
            const sibTarget = nodeById.get(sib.target);
            if (!sibTarget) continue;
            const dir: "left" | "right" =
                sourceNode.position.x <= sibTarget.position.x ? "right" : "left";
            if (dir === currentDirection) {
                sameDirTargets.push({ id: sib.id, y: sibTarget.position.y });
            }
        }
        sameDirTargets.push({ id: edge.id, y: targetNode.position.y });
        sameDirTargets.sort((a, b) => a.y - b.y);
        const idx = sameDirTargets.findIndex((t) => t.id === edge.id);
        const centeredLane = idx - (sameDirTargets.length - 1) / 2;
        const lanePenalty = Math.abs(centeredLane) * EDGE_STYLE.laneStep;

        const sBounds = boundsById.get(edge.source)!;
        const tBounds = boundsById.get(edge.target)!;
        const xMin = Math.min(sBounds.x0, tBounds.x0);
        const xMax = Math.max(sBounds.x1, tBounds.x1);
        const yMid =
            ((sBounds.y0 + sBounds.y1) / 2 +
                (tBounds.y0 + tBounds.y1) / 2) /
            2;

        let obstacleCount = 0;
        for (const n of nodes) {
            if (n.id === edge.source || n.id === edge.target) continue;
            const b = boundsById.get(n.id)!;
            const overlapsX = b.x0 <= xMax && b.x1 >= xMin;
            const overlapsY =
                yMid >= b.y0 - EDGE_STYLE.obstacleYPadding &&
                yMid <= b.y1 + EDGE_STYLE.obstacleYPadding;
            if (overlapsX && overlapsY) obstacleCount++;
        }

        offsets.set(
            edge.id,
            EDGE_STYLE.baseOffset +
                lanePenalty +
                obstacleCount * EDGE_STYLE.obstacleStep,
        );
    }

    cachedAllNodes = allNodes;
    cachedEdges = edges;
    cachedOffsets = offsets;
    return offsets;
}

/**
 * Subscribes to a single edge's routing offset. Returns a primitive number,
 * so consumers only re-render when this specific edge's offset changes.
 */
export function useEdgeOffset(edgeId: string): number {
    return useDiagramStore((s) => {
        const offsets = computeEdgeOffsets(s.nodes, s.edges);
        return offsets.get(edgeId) ?? EDGE_STYLE.baseOffset;
    });
}

// Explicit re-export so callers can pass DiagramNode[] at higher layers.
export type { DiagramNode };
