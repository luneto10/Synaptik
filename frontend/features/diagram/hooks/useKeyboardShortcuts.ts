import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDiagramStore } from "../store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import type { DiagramTool } from "../components/canvas/LeftToolbox";
import { TOOLS } from "../components/canvas/LeftToolbox";

interface Options {
    handleToolChange: (tool: DiagramTool) => void;
    setTableDialogOpen: (open: boolean) => void;
    setPendingConnectSource: (id: string | null) => void;
    handleToggleMinimap: () => void;
    handleAutoLayout: () => void;
    handleToggleSearch: () => void;
}

export function useKeyboardShortcuts({
    handleToolChange,
    setPendingConnectSource,
    handleToggleMinimap,
    handleAutoLayout,
    handleToggleSearch,
}: Options) {
    const handleUndo = useCallback(() => {
        endDiagramHistoryGestureIfActive();
        useDiagramStore.temporal.getState().undo();
    }, []);

    const handleRedo = useCallback(() => {
        endDiagramHistoryGestureIfActive();
        useDiagramStore.temporal.getState().redo();
    }, []);

    useHotkeys("mod+z", handleUndo, {
        preventDefault: true,
        enableOnFormTags: true,
    });
    useHotkeys("mod+shift+z, mod+y", handleRedo, {
        preventDefault: true,
        enableOnFormTags: true,
    });

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
            if (tool) handleToolChange(tool.value);
        },
        { preventDefault: true },
    );

    useHotkeys(
        "escape",
        () => {
            handleToolChange("select");
            setPendingConnectSource(null);
        },
        { preventDefault: true },
    );

    return {
        handleUndo,
        handleRedo,
    };
}
