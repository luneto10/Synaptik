import ELK from "elkjs/lib/elk.bundled";
import type { TableNode, RelationEdge } from "../../types/flow.types";
import { LAYOUT } from "../../constants";
import {
    colRowCenterY,
    nodeSize,
    type LayoutPositions,
} from "./shared";

const elk = new ELK();

// ELK layered algorithm options tuned for DB diagrams:
//   - NETWORK_SIMPLEX layering gives better layer assignment (shorter edges)
//   - BRANDES_KOEPF with BALANCED alignment vertically centers nodes per layer
//   - EDGE_LENGTH compaction keeps nodes closer without breaking routing
//   - Higher thoroughness (10) spends more effort on crossing minimisation
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

function graphFromNodesAndEdges(nodes: TableNode[], edges: RelationEdge[]) {
    const sourceCols = new Map<string, Set<string>>();
    const targetCols = new Map<string, Set<string>>();
    for (const n of nodes) {
        sourceCols.set(n.id, new Set());
        targetCols.set(n.id, new Set());
    }
    for (const e of edges) {
        if (e.data?.sourceColumnId)
            sourceCols.get(e.source)?.add(e.data.sourceColumnId);
        if (e.data?.targetColumnId)
            targetCols.get(e.target)?.add(e.data.targetColumnId);
    }

    return {
        id: "diagram",
        layoutOptions: ELK_ROOT_OPTIONS,
        children: nodes.map((n) => {
            const { width, height } = nodeSize(n);
            const srcCols = sourceCols.get(n.id) ?? new Set<string>();
            const tgtCols = targetCols.get(n.id) ?? new Set<string>();

            // FIXED_POS ports at each column's row centre let ELK route edges
            // to exact coordinates — drives port ordering to match FK column
            // ordering (e.g. order_id before product_id) and reduces crossings.
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
            const srcPort = e.data?.sourceColumnId
                ? `${e.data.sourceColumnId}-right`
                : e.source;
            const tgtPort = e.data?.targetColumnId
                ? `${e.data.targetColumnId}-left`
                : e.target;
            return { id: e.id, sources: [srcPort], targets: [tgtPort] };
        }),
    };
}

function fromElkLayout(elkGraph: {
    children?: Array<{
        id: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    }>;
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

export async function elkLayout(
    nodes: TableNode[],
    edges: RelationEdge[],
): Promise<LayoutPositions> {
    const graph = graphFromNodesAndEdges(nodes, edges);
    const laidOut = await elk.layout(graph);
    return fromElkLayout(laidOut);
}
