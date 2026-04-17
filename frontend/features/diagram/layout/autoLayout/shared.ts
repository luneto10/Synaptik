import type { TableNode, RelationEdge } from "../../types/flow.types";
import { LAYOUT } from "../../constants";

export type LayoutBox = { x: number; y: number; w: number; h: number };
export type LayoutPositions = Map<string, LayoutBox>;

// These must stay in sync with the constants in TableNode.tsx so that the
// port Y positions we give ELK match the actual rendered row centres.
export const NODE_HEADER_H = 48;
export const NODE_SEP_H = 1;
export const NODE_ROW_H = 34;

/** Vertical centre of column row i within the node (node-local coordinates). */
export function colRowCenterY(rowIndex: number): number {
    return NODE_HEADER_H + NODE_SEP_H + rowIndex * NODE_ROW_H + NODE_ROW_H / 2;
}

export const AUTO_LAYOUT = {
    componentGapX: 240,
    componentGapY: 200,
    minColumnGap: 100,
    minRowGap: 48,
    overlapIterations: 4,
    topLeftPaddingX: 80,
    topLeftPaddingY: 80,
} as const;

export function nodeSize(node: TableNode) {
    return {
        width: node.measured?.width ?? LAYOUT.DEFAULT_NODE_WIDTH,
        height: node.measured?.height ?? LAYOUT.DEFAULT_NODE_HEIGHT,
    };
}

export function centerX(box: LayoutBox) {
    return box.x + box.w / 2;
}

export function centerY(box: LayoutBox) {
    return box.y + box.h / 2;
}

export function overlap1D(a0: number, a1: number, b0: number, b1: number) {
    return Math.min(a1, b1) - Math.max(a0, b0);
}

function relationAdjacency(nodes: TableNode[], edges: RelationEdge[]) {
    const adjacency = new Map<string, Set<string>>();
    for (const n of nodes) adjacency.set(n.id, new Set());
    for (const e of edges) {
        adjacency.get(e.source)?.add(e.target);
        adjacency.get(e.target)?.add(e.source);
    }
    return adjacency;
}

export function connectedComponents(nodes: TableNode[], edges: RelationEdge[]) {
    const adjacency = relationAdjacency(nodes, edges);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const n of nodes) {
        if (visited.has(n.id)) continue;
        const queue = [n.id];
        const group: string[] = [];
        visited.add(n.id);
        while (queue.length) {
            const current = queue.shift();
            if (!current) continue;
            group.push(current);
            for (const next of adjacency.get(current) ?? []) {
                if (visited.has(next) || !byId.has(next)) continue;
                visited.add(next);
                queue.push(next);
            }
        }
        components.push(group);
    }

    const edgesByComponent = components.map((ids) => {
        const idSet = new Set(ids);
        return edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    });

    return components.map((ids, i) => ({
        nodeIds: ids,
        edges: edgesByComponent[i],
    }));
}

export function boundsFor(ids: string[], positions: LayoutPositions) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const id of ids) {
        const pos = positions.get(id);
        if (!pos) continue;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + pos.w);
        maxY = Math.max(maxY, pos.y + pos.h);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
        return { minX: 0, minY: 0, width: 0, height: 0 };
    }
    return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export function translate(
    ids: string[],
    positions: LayoutPositions,
    dx: number,
    dy: number,
) {
    for (const id of ids) {
        const pos = positions.get(id);
        if (!pos) continue;
        positions.set(id, { ...pos, x: pos.x + dx, y: pos.y + dy });
    }
}
