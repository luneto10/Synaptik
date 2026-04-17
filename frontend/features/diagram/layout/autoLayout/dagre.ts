import dagre from "dagre";
import type { TableNode, RelationEdge } from "../../types/flow.types";
import { LAYOUT } from "../../constants";
import { nodeSize, type LayoutPositions } from "./shared";

export function dagreFallback(
    nodes: TableNode[],
    edges: RelationEdge[],
): LayoutPositions {
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
