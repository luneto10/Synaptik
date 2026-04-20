import { useCallback } from "react";
import { useStoreApi } from "@xyflow/react";

/**
 * React Flow only shows selection bounds when `nodesSelectionActive` is true.
 * Call after programmatic selection changes (paste, duplicate, select-all).
 */
export function useActivateSelectionBounds() {
    const reactFlowStore = useStoreApi();

    return useCallback(() => {
        queueMicrotask(() => {
            reactFlowStore.setState({ nodesSelectionActive: true });
        });
    }, [reactFlowStore]);
}
