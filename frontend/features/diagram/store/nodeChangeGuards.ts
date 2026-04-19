import type { NodeChange } from "@xyflow/react";
import type { DiagramNode } from "../types/flow.types";

function isNodeChangeMeaningful(
    nodes: DiagramNode[],
    change: NodeChange,
): boolean {
    if (change.type !== "select") return true;

    const node = nodes.find((candidate) => candidate.id === change.id);
    if (!node) return false;
    return !!node.selected !== change.selected;
}

export function hasMeaningfulNodeChanges(
    nodes: DiagramNode[],
    changes: NodeChange[],
): boolean {
    return changes.some((change) => isNodeChangeMeaningful(nodes, change));
}
