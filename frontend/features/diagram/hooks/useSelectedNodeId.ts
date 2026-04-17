import { useSyncExternalStore } from "react";
import { useDiagramStore } from "../store/diagramStore";
import type { DiagramState } from "../store/diagramStore.types";
import type { TableNode } from "../types/flow.types";

function selectedNodeIdFromState(state: DiagramState): string | undefined {
    return (state.nodes as TableNode[]).find((n) => n.selected)?.id;
}

function selectedNodeIdsFromState(state: DiagramState): string[] {
    return (state.nodes as TableNode[])
        .filter((n) => n.selected)
        .map((n) => n.id);
}

function sameIds(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

const EMPTY_IDS: string[] = [];

let cachedIds: string[] = EMPTY_IDS;

function getStableSelectedNodeIds(): string[] {
    const next = selectedNodeIdsFromState(useDiagramStore.getState());
    if (next.length === 0) {
        cachedIds = EMPTY_IDS;
    } else if (!sameIds(cachedIds, next)) {
        cachedIds = next;
    }
    return cachedIds;
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

/**
 * Like {@link useSelectedNodeId} but returns every selected node id.
 * The returned array keeps a stable reference while the selection set is
 * unchanged, so it's safe to use as a memo/effect dependency.
 */
export function useSelectedNodeIds(): string[] {
    return useSyncExternalStore(
        (onStoreChange) => {
            let prev = getStableSelectedNodeIds();
            return useDiagramStore.subscribe(() => {
                const next = getStableSelectedNodeIds();
                if (next !== prev) {
                    prev = next;
                    onStoreChange();
                }
            });
        },
        getStableSelectedNodeIds,
        () => EMPTY_IDS,
    );
}
