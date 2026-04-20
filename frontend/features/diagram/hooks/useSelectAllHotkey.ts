import { useCallback, useEffect } from "react";
import { useDiagramStore } from "../store/diagramStore";
import { selectAll } from "../store/nodeSelection";
import {
    isEditableTarget,
    isSelectAllShortcut,
} from "../utils/keyboard-shortcuts";
import { useActivateSelectionBounds } from "./useActivateSelectionBounds";

export function useSelectAllHotkey() {
    const clearDocumentSelection = useCallback(() => {
        window.getSelection()?.removeAllRanges();
    }, []);

    const activateSelectionBounds = useActivateSelectionBounds();

    const selectAllNodes = useCallback(() => {
        const { nodes } = useDiagramStore.getState();
        if (nodes.length === 0) return;
        selectAll();
        activateSelectionBounds();
    }, [activateSelectionBounds]);

    useEffect(() => {
        const handleSelectAllCapture = (event: KeyboardEvent) => {
            if (!isSelectAllShortcut(event)) return;
            if (isEditableTarget(event.target)) return;

            event.preventDefault();
            clearDocumentSelection();
        };

        window.addEventListener("keydown", handleSelectAllCapture, true);
        return () => {
            window.removeEventListener("keydown", handleSelectAllCapture, true);
        };
    }, [clearDocumentSelection]);

    return useCallback(
        (event: KeyboardEvent) => {
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
            clearDocumentSelection();
            selectAllNodes();
        },
        [clearDocumentSelection, selectAllNodes],
    );
}
