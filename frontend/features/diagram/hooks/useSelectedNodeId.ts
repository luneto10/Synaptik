import { useSyncExternalStore } from "react";
import { useDiagramStore } from "../store/diagramStore";
import type { DiagramState } from "../store/diagramStore.types";
import type { TableNode } from "../types/flow.types";

function selectedNodeIdFromState(state: DiagramState): string | undefined {
    return (state.nodes as TableNode[]).find((n) => n.selected)?.id;
}

/**
 * Subscribes to the diagram store but only triggers a re-render when the
 * selected node id changes (not on every node drag / position update).
 */
export function useSelectedNodeId(): string | undefined {
    return useSyncExternalStore(
        (onStoreChange) => {
            let prev = selectedNodeIdFromState(useDiagramStore.getState());
            return useDiagramStore.subscribe((state) => {
                const next = selectedNodeIdFromState(state);
                if (next !== prev) {
                    prev = next;
                    onStoreChange();
                }
            });
        },
        () => selectedNodeIdFromState(useDiagramStore.getState()),
        () => undefined,
    );
}
