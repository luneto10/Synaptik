import type { NodeChange } from "@xyflow/react";
import { withoutHistory } from "./diagramHistory";
import { useDiagramStore } from "./diagramStore";

/** Replaces the current node selection with exactly the given ids. No history entry. */
export function replaceSelection(nodeIds: string[]) {
    withoutHistory(() => {
        const { nodes, onNodesChange } = useDiagramStore.getState();
        const selectedIds = new Set(nodeIds);
        const changes: NodeChange[] = [];
        for (const node of nodes) {
            const selected = selectedIds.has(node.id);
            if (!!node.selected === selected) continue;
            changes.push({
                type: "select",
                id: node.id,
                selected,
            });
        }
        if (changes.length === 0) return;
        onNodesChange(changes);
    });
}

/** Selects every node in the diagram. No history entry. */
export function selectAll() {
    withoutHistory(() => {
        const { nodes, onNodesChange } = useDiagramStore.getState();
        const changes: NodeChange[] = [];
        for (const node of nodes) {
            if (node.selected) continue;
            changes.push({
                type: "select",
                id: node.id,
                selected: true,
            });
        }
        if (changes.length === 0) return;
        onNodesChange(changes);
    });
}
