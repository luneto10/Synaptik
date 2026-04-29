import {
    isBoxNode,
    isTableNode,
    type DiagramNode,
    type RelationEdge,
} from "../types/flow.types";
import type { DiagramDialectId } from "../types/db.types";

export interface DiagramSnapshot {
    dialect: DiagramDialectId;
    nodes: DiagramNode[];
    edges: RelationEdge[];
}

interface SnapshotOptions {
    includeMeasured: boolean;
}

function sanitizeNode(
    node: DiagramNode,
    options: SnapshotOptions,
): DiagramNode {
    if (isTableNode(node)) {
        return {
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
            width: node.width,
            height: node.height,
            measured: options.includeMeasured ? node.measured : undefined,
            zIndex: node.zIndex,
        } as DiagramNode;
    }

    if (isBoxNode(node)) {
        return {
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
            width: node.width,
            height: node.height,
            measured: options.includeMeasured ? node.measured : undefined,
            zIndex: node.zIndex,
        } as DiagramNode;
    }

    return node;
}

function sanitizeEdge(edge: RelationEdge): RelationEdge {
    return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
        label: edge.label,
        data: edge.data,
        zIndex: edge.zIndex,
        markerStart: edge.markerStart,
        markerEnd: edge.markerEnd,
    } as RelationEdge;
}

function createDiagramSnapshot(
    dialect: DiagramDialectId,
    nodes: DiagramNode[],
    edges: RelationEdge[],
    options: SnapshotOptions,
): DiagramSnapshot {
    return {
        dialect,
        nodes: nodes.map((node) => sanitizeNode(node, options)),
        edges: edges.map(sanitizeEdge),
    };
}

export function createPersistedDiagramSnapshot(
    dialectOrNodes: DiagramDialectId | DiagramNode[],
    nodesOrEdges: DiagramNode[] | RelationEdge[],
    maybeEdges?: RelationEdge[],
): DiagramSnapshot {
    const dialect = Array.isArray(dialectOrNodes)
        ? "postgres"
        : dialectOrNodes;
    const nodes = Array.isArray(dialectOrNodes)
        ? dialectOrNodes
        : (nodesOrEdges as DiagramNode[]);
    const edges = Array.isArray(dialectOrNodes)
        ? (nodesOrEdges as RelationEdge[])
        : (maybeEdges ?? []);

    return createDiagramSnapshot(dialect, nodes, edges, {
        includeMeasured: false,
    });
}

export function createHistoryDiagramSnapshot(
    dialectOrNodes: DiagramDialectId | DiagramNode[],
    nodesOrEdges: DiagramNode[] | RelationEdge[],
    maybeEdges?: RelationEdge[],
): DiagramSnapshot {
    const dialect = Array.isArray(dialectOrNodes)
        ? "postgres"
        : dialectOrNodes;
    const nodes = Array.isArray(dialectOrNodes)
        ? dialectOrNodes
        : (nodesOrEdges as DiagramNode[]);
    const edges = Array.isArray(dialectOrNodes)
        ? (nodesOrEdges as RelationEdge[])
        : (maybeEdges ?? []);

    return createDiagramSnapshot(dialect, nodes, edges, {
        includeMeasured: true,
    });
}
