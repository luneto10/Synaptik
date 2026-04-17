import type { TableNode, RelationEdge } from "../../types/flow.types";
import { connectedComponents, type LayoutPositions } from "./shared";
import { elkLayout } from "./elk";
import { dagreFallback } from "./dagre";
import {
    balanceHeavyFanIn,
    normalizeCanvasOrigin,
    packComponents,
    resolveNodeOverlaps,
} from "./pack";

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
            (
                change,
            ): change is {
                id: string;
                type: "position";
                position: { x: number; y: number };
            } => Boolean(change),
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
            const componentPositions = await elkLayout(
                componentNodes,
                component.edges,
            );
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
    balanceHeavyFanIn(positions, edges);
    resolveNodeOverlaps(positions);
    normalizeCanvasOrigin(positions);

    return toPositionChanges(nodes, positions);
}
