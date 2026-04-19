import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useStoreApi } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import { TOOLS, type ToolValue } from "../components/canvas/LeftToolbox";

interface Options {
    handleToolAction: (value: ToolValue) => void;
    setTableDialogOpen: (open: boolean) => void;
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
    const reactFlowStore = useStoreApi();

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
        // Activate xyflow's NodesSelection box so pasted nodes render inside a
        // draggable group, matching the behaviour after a drag-box selection.
        // Must run after xyflow's internal setNodes (triggered by the node
        // prop change), which would otherwise reset the flag.
        queueMicrotask(() => {
            reactFlowStore.setState({ nodesSelectionActive: true });
        });
    }, [getPasteAnchor, reactFlowStore]);

    const handleDuplicate = useCallback((event: KeyboardEvent) => {
        const { nodes, duplicateSelection } = useDiagramStore.getState();
        if (!nodes.some((n) => n.selected)) return;
        event.preventDefault();
        duplicateSelection();
        queueMicrotask(() => {
            reactFlowStore.setState({ nodesSelectionActive: true });
        });
    }, [reactFlowStore]);

    useHotkeys("mod+z", handleUndo, {
        preventDefault: true,
        enableOnFormTags: true,
    });
    useHotkeys("mod+shift+z, mod+y", handleRedo, {
        preventDefault: true,
        enableOnFormTags: true,
    });
    useHotkeys("mod+c", handleCopy, { preventDefault: false });
    useHotkeys("mod+v", handlePaste, { preventDefault: false });
    useHotkeys("mod+d", handleDuplicate, { preventDefault: true });

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
