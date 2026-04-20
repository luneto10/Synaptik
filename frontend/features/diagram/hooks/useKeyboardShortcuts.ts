import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDiagramStore } from "../store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import { TOOLS, type ToolValue } from "../components/canvas/LeftToolbox";
import { useActivateSelectionBounds } from "./useActivateSelectionBounds";
import { useSelectAllHotkey } from "./useSelectAllHotkey";

interface Options {
    handleToolAction: (value: ToolValue) => void;
    setPendingConnectSource: (id: string | null) => void;
    handleToggleMinimap: () => void;
    handleAutoLayout: () => void;
    handleToggleSearch: () => void;
    /** Returns the current pointer position in flow coords, or null if not over the canvas. */
    getPasteAnchor?: () => { x: number; y: number } | null;
}

export function useKeyboardShortcuts({
    handleToolAction,
    setPendingConnectSource,
    handleToggleMinimap,
    handleAutoLayout,
    handleToggleSearch,
    getPasteAnchor,
}: Options) {
    const handleSelectAll = useSelectAllHotkey();
    const activateSelectionBounds = useActivateSelectionBounds();

    const handleUndo = useCallback(() => {
        endDiagramHistoryGestureIfActive();
        useDiagramStore.temporal.getState().undo();
    }, []);

    const handleRedo = useCallback(() => {
        endDiagramHistoryGestureIfActive();
        useDiagramStore.temporal.getState().redo();
    }, []);

    const handleCopy = useCallback((event: KeyboardEvent) => {
        const { nodes, copySelection } = useDiagramStore.getState();
        if (!nodes.some((n) => n.selected)) return;
        event.preventDefault();
        copySelection();
    }, []);

    const handlePaste = useCallback((event: KeyboardEvent) => {
        event.preventDefault();
        const anchor = getPasteAnchor?.() ?? undefined;
        useDiagramStore.getState().pasteClipboard(anchor);
        activateSelectionBounds();
    }, [activateSelectionBounds, getPasteAnchor]);

    const handleDuplicate = useCallback((event: KeyboardEvent) => {
        const { nodes, duplicateSelection } = useDiagramStore.getState();
        if (!nodes.some((n) => n.selected)) return;
        event.preventDefault();
        duplicateSelection();
        activateSelectionBounds();
    }, [activateSelectionBounds]);

    useHotkeys("mod+z", handleUndo, { preventDefault: true });
    useHotkeys("mod+shift+z, mod+y", handleRedo, { preventDefault: true });
    useHotkeys("mod+c", handleCopy, { preventDefault: false });
    useHotkeys("mod+v", handlePaste, { preventDefault: false });
    useHotkeys("mod+d", handleDuplicate, { preventDefault: true });
    useHotkeys("mod+a", handleSelectAll, { preventDefault: true });

    useHotkeys("l", handleAutoLayout, { preventDefault: true });
    useHotkeys("m", handleToggleMinimap, { preventDefault: true });
    useHotkeys("mod+k", handleToggleSearch, {
        preventDefault: true,
        enableOnFormTags: true,
    });

    useHotkeys(
        TOOLS.map((t) => t.shortcut).join(","),
        (_event, handler) => {
            const pressed = handler.keys?.[0]?.toLowerCase();
            const tool = TOOLS.find(
                (t) => t.shortcut.toLowerCase() === pressed,
            );
            if (tool) handleToolAction(tool.value);
        },
        { preventDefault: true },
    );

    useHotkeys(
        "escape",
        () => {
            handleToolAction("select");
            setPendingConnectSource(null);
        },
        { preventDefault: true },
    );

    return {
        handleUndo,
        handleRedo,
    };
}
