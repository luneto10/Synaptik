import ELK from "elkjs/lib/elk.bundled";
import dagre from "dagre";
import type { TableNode, RelationEdge } from "../types/flow.types";
import { LAYOUT } from "../constants";

type LayoutBox = {
    x: number;
    y: number;
    w: number;
    h: number;
};

type LayoutPositions = Map<string, LayoutBox>;

const elk = new ELK();

// These must stay in sync with the constants in TableNode.tsx so that the
// port Y positions we give ELK match the actual rendered row centres.
const NODE_HEADER_H = 48;
const NODE_SEP_H = 1;
const NODE_ROW_H = 34;

/** Vertical centre of column row i within the node (node-local coordinates). */
function colRowCenterY(rowIndex: number): number {
    return NODE_HEADER_H + NODE_SEP_H + rowIndex * NODE_ROW_H + NODE_ROW_H / 2;
}

const AUTO_LAYOUT = {
    componentGapX: 240,
    componentGapY: 200,
    minColumnGap: 100,
    minRowGap: 48,
    overlapIterations: 4,
    topLeftPaddingX: 80,
    topLeftPaddingY: 80,
} as const;

// ELK layered algorithm options tuned for DB diagrams:
//   - NETWORK_SIMPLEX layering gives better layer assignment (shorter edges)
//   - BRANDES_KOEPF with BALANCED alignment vertically centers nodes in each layer
//   - EDGE_LENGTH compaction keeps nodes closer together without breaking routing
//   - Higher thoroughness (10) lets ELK spend more effort on crossing minimisation
//   - Generous spacing so orthogonal edge segments don't crowd the table boxes
const ELK_ROOT_OPTIONS: Record<string, string> = {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.spacing.nodeNode": "80",
    "elk.layered.spacing.nodeNodeBetweenLayers": "160",
    "elk.spacing.edgeNode": "36",
    "elk.layered.spacing.edgeNodeBetweenLayers": "48",
    "elk.spacing.edgeEdge": "18",
    "elk.layered.spacing.edgeEdgeBetweenLayers": "18",
    "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.layered.nodePlacement.favorStraightEdges": "true",
    "elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.layered.thoroughness": "10",
    "elk.padding": "[top=60, left=60, bottom=60, right=60]",
};

function nodeSize(node: TableNode) {
    return {
        width: node.measured?.width ?? LAYOUT.DEFAULT_NODE_WIDTH,
        height: node.measured?.height ?? LAYOUT.DEFAULT_NODE_HEIGHT,
    };
}

function graphFromNodesAndEdges(nodes: TableNode[], edges: RelationEdge[]) {
    // Collect which column IDs are source/target endpoints per node.
    const sourceCols = new Map<string, Set<string>>();
    const targetCols = new Map<string, Set<string>>();
    for (const n of nodes) {
        sourceCols.set(n.id, new Set());
        targetCols.set(n.id, new Set());
    }
    for (const e of edges) {
        if (e.data?.sourceColumnId) sourceCols.get(e.source)?.add(e.data.sourceColumnId);
        if (e.data?.targetColumnId) targetCols.get(e.target)?.add(e.data.targetColumnId);
    }

    return {
        id: "diagram",
        layoutOptions: ELK_ROOT_OPTIONS,
        children: nodes.map((n) => {
            const { width, height } = nodeSize(n);
            const srcCols = sourceCols.get(n.id) ?? new Set<string>();
            const tgtCols = targetCols.get(n.id) ?? new Set<string>();

            // Create ELK ports positioned at the exact row centre of every
            // column that is an edge endpoint.  FIXED_POS tells ELK to route
            // edges to these exact coordinates, which lets its crossing-
            // minimisation algorithm order adjacent layers to match the FK
            // column ordering in the table (e.g. order_id before product_id).
            const ports: Array<{
                id: string;
                x: number;
                y: number;
                width: number;
                height: number;
                properties: Record<string, string>;
            }> = [];

            for (let i = 0; i < n.data.columns.length; i++) {
                const col = n.data.columns[i];
                const y = colRowCenterY(i);
                if (srcCols.has(col.id)) {
                    ports.push({
                        id: `${col.id}-right`,
                        x: width,
                        y,
                        width: 1,
                        height: 1,
                        properties: { "elk.port.side": "EAST" },
                    });
                }
                if (tgtCols.has(col.id)) {
                    ports.push({
                        id: `${col.id}-left`,
                        x: 0,
                        y,
                        width: 1,
                        height: 1,
                        properties: { "elk.port.side": "WEST" },
                    });
                }
            }

            return {
                id: n.id,
                width,
                height,
                ports,
                layoutOptions: {
                    "elk.portConstraints": ports.length > 0 ? "FIXED_POS" : "FREE",
                },
            };
        }),
        edges: edges.map((e) => {
            // Wire each edge to column-level ports so ELK can route them to the
            // correct row and use port ordering to avoid crossings.
            const srcPort = e.data?.sourceColumnId
                ? `${e.data.sourceColumnId}-right`
                : e.source;
            const tgtPort = e.data?.targetColumnId
                ? `${e.data.targetColumnId}-left`
                : e.target;
            return {
                id: e.id,
                sources: [srcPort],
                targets: [tgtPort],
            };
        }),
    };
}

function centerX(box: LayoutBox) {
    return box.x + box.w / 2;
}

function centerY(box: LayoutBox) {
    return box.y + box.h / 2;
}

function overlap1D(a0: number, a1: number, b0: number, b1: number) {
    return Math.min(a1, b1) - Math.max(a0, b0);
}

function fromElkLayout(elkGraph: {
    children?: Array<{ id: string; x?: number; y?: number; width?: number; height?: number }>;
}): LayoutPositions {
    const positions: LayoutPositions = new Map();
    for (const child of elkGraph.children ?? []) {
        positions.set(child.id, {
            x: child.x ?? 0,
            y: child.y ?? 0,
            w: child.width ?? LAYOUT.DEFAULT_NODE_WIDTH,
            h: child.height ?? LAYOUT.DEFAULT_NODE_HEIGHT,
        });
    }
    return positions;
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

function connectedComponents(nodes: TableNode[], edges: RelationEdge[]) {
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

    return components.map((ids, i) => ({ nodeIds: ids, edges: edgesByComponent[i] }));
}

function dagreFallback(nodes: TableNode[], edges: RelationEdge[]): LayoutPositions {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
        rankdir: "LR",
        nodesep: LAYOUT.DAGRE_NODE_SEP,
        ranksep: LAYOUT.DAGRE_RANK_SEP,
    });

    for (const n of nodes) {
        const { width, height } = nodeSize(n);
        g.setNode(n.id, { width, height });
    }
    for (const e of edges) g.setEdge(e.source, e.target);

    dagre.layout(g);

    const positions: LayoutPositions = new Map();
    for (const n of nodes) {
        const { x, y, width, height } = g.node(n.id);
        positions.set(n.id, {
            x: x - width / 2,
            y: y - height / 2,
            w: width,
            h: height,
        });
    }
    return positions;
}

function boundsFor(ids: string[], positions: LayoutPositions) {
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

function translate(ids: string[], positions: LayoutPositions, dx: number, dy: number) {
    for (const id of ids) {
        const pos = positions.get(id);
        if (!pos) continue;
        positions.set(id, { ...pos, x: pos.x + dx, y: pos.y + dy });
    }
}

/**
 * Arrange disconnected components on the canvas.
 * Components are sorted largest-first then placed into rows whose width is
 * determined by the square root of the total content area (targeting a roughly
 * 16:10 aspect ratio).  This produces a balanced grid instead of a single
 * ever-growing horizontal strip.
 */
function packComponents(
    components: Array<{ nodeIds: string[]; edges: RelationEdge[] }>,
    positions: LayoutPositions,
) {
    if (components.length <= 1) return;

    const sorted = [...components].sort(
        (a, b) =>
            b.nodeIds.length - a.nodeIds.length ||
            b.edges.length - a.edges.length,
    );

    const bounds = sorted.map((c) => boundsFor(c.nodeIds, positions));

    // Target canvas width: sqrt(totalArea * 1.6) approximates a 16:10 aspect ratio
    const totalArea = bounds.reduce(
        (acc, b) =>
            acc +
            (b.width + AUTO_LAYOUT.componentGapX) *
                (b.height + AUTO_LAYOUT.componentGapY),
        0,
    );
    const targetWidth = Math.sqrt(totalArea * 1.6);

    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;

    sorted.forEach((component, index) => {
        const b = bounds[index];
        // Wrap to a new row when the next component would overflow the target
        // width — but always place at least one component per row.
        if (index > 0 && cursorX + b.width > targetWidth) {
            cursorX = 0;
            cursorY += rowHeight + AUTO_LAYOUT.componentGapY;
            rowHeight = 0;
        }
        translate(component.nodeIds, positions, cursorX - b.minX, cursorY - b.minY);
        cursorX += b.width + AUTO_LAYOUT.componentGapX;
        rowHeight = Math.max(rowHeight, b.height);
    });
}

/**
 * Balance the visual layout when a hub node has many incoming sources all
 * landing on its left side.  Nodes that connect *exclusively* to that hub
 * (no other edges) are candidates — the bottom half of them get relocated to
 * the right side of the hub, creating a symmetric fan-in / fan-out look
 * instead of a one-sided pileup.
 *
 * Only exclusive leaf nodes are moved so no other edge routes are disrupted.
 */
function balanceHeavyFanIn(positions: LayoutPositions, edges: RelationEdge[]) {
    const THRESHOLD = 3;
    const GAP = LAYOUT.DAGRE_NODE_SEP;

    // For each source node, count how many distinct targets it connects to.
    const sourceTargetCount = new Map<string, number>();
    for (const e of edges) {
        sourceTargetCount.set(
            e.source,
            (sourceTargetCount.get(e.source) ?? 0) + 1,
        );
    }

    // Collect unique sources per target (deduplicated).
    const sourcesByTarget = new Map<string, Set<string>>();
    for (const e of edges) {
        if (!sourcesByTarget.has(e.target)) sourcesByTarget.set(e.target, new Set());
        sourcesByTarget.get(e.target)?.add(e.source);
    }

    for (const [targetId, sourcesSet] of sourcesByTarget) {
        const targetPos = positions.get(targetId);
        if (!targetPos) continue;

        // Exclusive left-side sources: sit to the left AND only connect here.
        const leftExclusive = [...sourcesSet].filter((sid) => {
            const sPos = positions.get(sid);
            if (!sPos) return false;
            if (sPos.x >= targetPos.x) return false;           // already right
            return (sourceTargetCount.get(sid) ?? 0) === 1;    // only this target
        });

        if (leftExclusive.length <= THRESHOLD) continue;

        // Sort by Y so the split is spatially contiguous.
        leftExclusive.sort(
            (a, b) => (positions.get(a)?.y ?? 0) - (positions.get(b)?.y ?? 0),
        );

        // Move the bottom half to the right side of the hub.
        const splitAt = Math.ceil(leftExclusive.length / 2);
        const toMoveRight = leftExclusive.slice(splitAt);

        const rightX = targetPos.x + targetPos.w + AUTO_LAYOUT.componentGapX / 2;
        const totalH = toMoveRight.reduce(
            (acc, id) => acc + (positions.get(id)?.h ?? 0) + GAP,
            -GAP,
        );
        let y = targetPos.y + targetPos.h / 2 - totalH / 2;

        for (const sid of toMoveRight) {
            const sPos = positions.get(sid);
            if (!sPos) continue;
            positions.set(sid, { ...sPos, x: rightX, y });
            y += sPos.h + GAP;
        }
    }
}

/**
 * Safety-net pass: push apart any pair of nodes that still overlap after ELK
 * and component packing.  ELK guarantees non-overlap within a component, but
 * the pack step can cause inter-component collisions.
 */
function resolveNodeOverlaps(positions: LayoutPositions) {
    const ids = [...positions.keys()];
    for (let iter = 0; iter < AUTO_LAYOUT.overlapIterations; iter++) {
        let changed = false;
        for (let i = 0; i < ids.length; i++) {
            const aId = ids[i];
            const a = positions.get(aId);
            if (!a) continue;
            for (let j = i + 1; j < ids.length; j++) {
                const bId = ids[j];
                const b = positions.get(bId);
                if (!b) continue;

                const ox = overlap1D(
                    a.x - AUTO_LAYOUT.minColumnGap / 2,
                    a.x + a.w + AUTO_LAYOUT.minColumnGap / 2,
                    b.x - AUTO_LAYOUT.minColumnGap / 2,
                    b.x + b.w + AUTO_LAYOUT.minColumnGap / 2,
                );
                const oy = overlap1D(
                    a.y - AUTO_LAYOUT.minRowGap / 2,
                    a.y + a.h + AUTO_LAYOUT.minRowGap / 2,
                    b.y - AUTO_LAYOUT.minRowGap / 2,
                    b.y + b.h + AUTO_LAYOUT.minRowGap / 2,
                );

                if (ox <= 0 || oy <= 0) continue;

                changed = true;
                if (ox < oy) {
                    const push = ox / 2 + 1;
                    if (centerX(a) <= centerX(b)) {
                        positions.set(aId, { ...a, x: a.x - push });
                        positions.set(bId, { ...b, x: b.x + push });
                    } else {
                        positions.set(aId, { ...a, x: a.x + push });
                        positions.set(bId, { ...b, x: b.x - push });
                    }
                } else {
                    const push = oy / 2 + 1;
                    if (centerY(a) <= centerY(b)) {
                        positions.set(aId, { ...a, y: a.y - push });
                        positions.set(bId, { ...b, y: b.y + push });
                    } else {
                        positions.set(aId, { ...a, y: a.y + push });
                        positions.set(bId, { ...b, y: b.y - push });
                    }
                }
            }
        }
        if (!changed) break;
    }
}

function normalizeCanvasOrigin(positions: LayoutPositions) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;

    for (const p of positions.values()) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

    const dx = AUTO_LAYOUT.topLeftPaddingX - minX;
    const dy = AUTO_LAYOUT.topLeftPaddingY - minY;
    for (const [id, p] of positions) {
        positions.set(id, { ...p, x: p.x + dx, y: p.y + dy });
    }
}

function toPositionChanges(nodes: TableNode[], positions: LayoutPositions) {
    return nodes
        .map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            return {
                id: node.id,
                type: "position" as const,
                position: { x: pos.x, y: pos.y },
            };
        })
        .filter(
            (change): change is { id: string; type: "position"; position: { x: number; y: number } } =>
                Boolean(change),
        );
}

export async function buildAutoLayoutChanges(
    nodes: TableNode[],
    edges: RelationEdge[],
) {
    const positions: LayoutPositions = new Map();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const components = connectedComponents(nodes, edges);

    for (const component of components) {
        const componentNodes = component.nodeIds
            .map((id) => byId.get(id))
            .filter((node): node is TableNode => Boolean(node));
        if (componentNodes.length === 0) continue;

        try {
            const graph = graphFromNodesAndEdges(componentNodes, component.edges);
            const laidOut = await elk.layout(graph);
            const componentPositions = fromElkLayout(laidOut);
            for (const [id, pos] of componentPositions) {
                positions.set(id, pos);
            }
        } catch {
            const fallback = dagreFallback(componentNodes, component.edges);
            for (const [id, pos] of fallback) {
                positions.set(id, pos);
            }
        }
    }

    // 1. Pack disconnected components into a balanced grid.
    packComponents(components, positions);
    // 2. For hub nodes with too many left-side leaf sources, move the bottom
    //    half to the right side to create a balanced fan-out appearance.
    balanceHeavyFanIn(positions, edges);
    // 3. Push apart any overlaps the packing/balancing steps introduced.
    resolveNodeOverlaps(positions);
    normalizeCanvasOrigin(positions);

    return toPositionChanges(nodes, positions);
}
