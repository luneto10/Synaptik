import {
    isBoxNode,
    isTableNode,
    type DiagramNode,
    type RelationEdge,
} from "../types/flow.types";

export interface DiagramSnapshot {
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
    nodes: DiagramNode[],
    edges: RelationEdge[],
    options: SnapshotOptions,
): DiagramSnapshot {
    return {
        nodes: nodes.map((node) => sanitizeNode(node, options)),
        edges: edges.map(sanitizeEdge),
    };
}

export function createPersistedDiagramSnapshot(
    nodes: DiagramNode[],
    edges: RelationEdge[],
): DiagramSnapshot {
    return createDiagramSnapshot(nodes, edges, { includeMeasured: false });
}

export function createHistoryDiagramSnapshot(
    nodes: DiagramNode[],
    edges: RelationEdge[],
): DiagramSnapshot {
    return createDiagramSnapshot(nodes, edges, { includeMeasured: true });
}
