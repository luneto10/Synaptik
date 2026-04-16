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

const AUTO_LAYOUT = {
    nodeGap: 56,
    componentGapX: 220,
    componentGapY: 180,
    minColumnGap: 120,
    minRowGap: 54,
    maxEdgeSpan: 760,
    edgeCompressionIterations: 4,
    overlapIterations: 8,
    topLeftPaddingX: 80,
    topLeftPaddingY: 80,
} as const;

const ELK_ROOT_OPTIONS: Record<string, string> = {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.spacing.nodeNode": "60",
    "elk.layered.spacing.nodeNodeBetweenLayers": "130",
    "elk.spacing.edgeNode": "28",
    "elk.layered.spacing.edgeNodeBetweenLayers": "36",
    "elk.layered.nodePlacement.favorStraightEdges": "true",
    "elk.layered.compaction.postCompaction.strategy": "LEFT",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.layered.considerModelOrder": "NODES_AND_EDGES",
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.layered.thoroughness": "7",
};

function nodeSize(node: TableNode) {
    return {
        width: node.measured?.width ?? LAYOUT.DEFAULT_NODE_WIDTH,
        height: node.measured?.height ?? LAYOUT.DEFAULT_NODE_HEIGHT,
    };
}

function graphFromNodesAndEdges(nodes: TableNode[], edges: RelationEdge[]) {
    return {
        id: "diagram",
        layoutOptions: ELK_ROOT_OPTIONS,
        children: nodes.map((n) => {
            const { width, height } = nodeSize(n);
            return {
                id: n.id,
                width,
                height,
            };
        }),
        edges: edges.map((e) => ({
            id: e.id,
            sources: [e.source],
            targets: [e.target],
        })),
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

function packComponents(
    components: Array<{ nodeIds: string[]; edges: RelationEdge[] }>,
    positions: LayoutPositions,
) {
    const sorted = [...components].sort(
        (a, b) =>
            b.nodeIds.length - a.nodeIds.length ||
            b.edges.length - a.edges.length,
    );

    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    const wrapAfter = Math.max(3, Math.ceil(Math.sqrt(components.length)));

    sorted.forEach((component, index) => {
        const b = boundsFor(component.nodeIds, positions);
        if (index > 0 && index % wrapAfter === 0) {
            cursorX = 0;
            cursorY += rowHeight + AUTO_LAYOUT.componentGapY;
            rowHeight = 0;
        }
        translate(component.nodeIds, positions, cursorX - b.minX, cursorY - b.minY);
        cursorX += b.width + AUTO_LAYOUT.componentGapX;
        rowHeight = Math.max(rowHeight, b.height);
    });
}

function balanceJunctionGroups(positions: LayoutPositions, edges: RelationEdge[]) {
    const junctionParents = new Map<string, Set<string>>();
    for (const e of edges) {
        const junctionId = e.data?.junctionTableId;
        if (!junctionId) continue;
        if (!junctionParents.has(junctionId)) junctionParents.set(junctionId, new Set());
        junctionParents.get(junctionId)?.add(e.source);
    }

    const stackHeight = (group: Array<{ pos: LayoutBox }>) =>
        group.reduce((acc, item) => acc + item.pos.h, 0) +
        Math.max(0, group.length - 1) * LAYOUT.DAGRE_NODE_SEP;

    for (const [junctionId, parentsSet] of junctionParents) {
        if (parentsSet.size < 2) continue;
        const junctionPos = positions.get(junctionId);
        if (!junctionPos) continue;

        const parents = [...parentsSet]
            .map((id) => ({ id, pos: positions.get(id) }))
            .filter((entry): entry is { id: string; pos: LayoutBox } => Boolean(entry.pos))
            .sort((a, b) => a.pos.y - b.pos.y);
        if (parents.length < 2) continue;

        const splitAt = Math.ceil(parents.length / 2);
        const leftGroup = parents.slice(0, splitAt);
        const rightGroup = parents.slice(splitAt);
        const anchorY = junctionPos.y + junctionPos.h / 2;

        let y = anchorY - stackHeight(leftGroup) / 2;
        for (const parent of leftGroup) {
            positions.set(parent.id, { ...parent.pos, y });
            y += parent.pos.h + LAYOUT.DAGRE_NODE_SEP;
        }

        const rightX = junctionPos.x + junctionPos.w + AUTO_LAYOUT.minColumnGap + 24;
        y = anchorY - stackHeight(rightGroup) / 2;
        for (const parent of rightGroup) {
            positions.set(parent.id, { ...parent.pos, x: rightX, y });
            y += parent.pos.h + LAYOUT.DAGRE_NODE_SEP;
        }
    }
}

function balanceHeavyFanIn(positions: LayoutPositions, edges: RelationEdge[]) {
    const BALANCE_THRESHOLD = 3;
    const sourcesByTarget = new Map<string, string[]>();

    for (const e of edges) {
        if (!sourcesByTarget.has(e.target)) sourcesByTarget.set(e.target, []);
        sourcesByTarget.get(e.target)?.push(e.source);
    }

    for (const [targetId, sourceIds] of sourcesByTarget) {
        const targetPos = positions.get(targetId);
        if (!targetPos) continue;

        const uniqueSources = [...new Set(sourceIds)];
        const leftSources = uniqueSources.filter(
            (sourceId) => (positions.get(sourceId)?.x ?? 0) < targetPos.x,
        );
        if (leftSources.length <= BALANCE_THRESHOLD) continue;

        leftSources.sort(
            (a, b) => (positions.get(a)?.y ?? 0) - (positions.get(b)?.y ?? 0),
        );

        const rightHalf = leftSources.slice(Math.ceil(leftSources.length / 2));
        const rightX =
            targetPos.x + targetPos.w + AUTO_LAYOUT.minColumnGap + 36;
        let rightY = targetPos.y;

        for (const id of rightHalf) {
            const pos = positions.get(id);
            if (!pos) continue;
            positions.set(id, { ...pos, x: rightX, y: rightY });
            rightY += pos.h + LAYOUT.DAGRE_NODE_SEP;
        }
    }
}

function compressLongEdges(positions: LayoutPositions, edges: RelationEdge[]) {
    const touched = new Set<string>();
    for (let i = 0; i < AUTO_LAYOUT.edgeCompressionIterations; i++) {
        touched.clear();
        for (const edge of edges) {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) continue;
            const dx = centerX(target) - centerX(source);
            if (Math.abs(dx) <= AUTO_LAYOUT.maxEdgeSpan) continue;
            const overflow = Math.abs(dx) - AUTO_LAYOUT.maxEdgeSpan;
            const shift = Math.max(18, overflow * 0.45);
            if (dx > 0) {
                if (!touched.has(edge.target)) {
                    positions.set(edge.target, { ...target, x: target.x - shift });
                    touched.add(edge.target);
                }
            } else if (!touched.has(edge.source)) {
                positions.set(edge.source, { ...source, x: source.x - shift });
                touched.add(edge.source);
            }
        }
    }
}

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
                    const aCenter = centerX(a);
                    const bCenter = centerX(b);
                    if (aCenter <= bCenter) {
                        positions.set(aId, { ...a, x: a.x - push });
                        positions.set(bId, { ...b, x: b.x + push });
                    } else {
                        positions.set(aId, { ...a, x: a.x + push });
                        positions.set(bId, { ...b, x: b.x - push });
                    }
                } else {
                    const push = oy / 2 + 1;
                    const aCenter = centerY(a);
                    const bCenter = centerY(b);
                    if (aCenter <= bCenter) {
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
        .filter((change): change is { id: string; type: "position"; position: { x: number; y: number } } => Boolean(change));
}

export async function buildAutoLayoutChanges(
    nodes: TableNode[],
    edges: RelationEdge[],
) {
    let positions: LayoutPositions = new Map();
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

    packComponents(components, positions);
    compressLongEdges(positions, edges);
    balanceJunctionGroups(positions, edges);
    balanceHeavyFanIn(positions, edges);
    resolveNodeOverlaps(positions);
    normalizeCanvasOrigin(positions);

    return toPositionChanges(nodes, positions);
}
