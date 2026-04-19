import type { NodeChange } from "@xyflow/react";
import { withoutHistory } from "./diagramHistory";
import { useDiagramStore } from "./diagramStore";

/** Replaces the current node selection with exactly the given ids. No history entry. */
export function replaceSelection(nodeIds: string[]) {
    withoutHistory(() => {
        const { nodes, onNodesChange } = useDiagramStore.getState();
        const selectedIds = new Set(nodeIds);
        const changes: NodeChange[] = nodes.map((node) => ({
            type: "select",
            id: node.id,
            selected: selectedIds.has(node.id),
        }));
        onNodesChange(changes);
    });
}
