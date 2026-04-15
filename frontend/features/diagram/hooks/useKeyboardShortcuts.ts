import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDiagramStore } from "../store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

interface Options {
    handleToolChange: (tool: DiagramTool) => void;
    setTableDialogOpen: (open: boolean) => void;
    setPendingConnectSource: (id: string | null) => void;
}

export function useKeyboardShortcuts({
    handleToolChange,
    setTableDialogOpen,
    setPendingConnectSource,
}: Options) {
    const selectedNodeId = useDiagramStore(
        (s) => s?.nodes?.find((n) => n.selected)?.id,
    );

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

    useHotkeys("t", () => setTableDialogOpen(true), { preventDefault: true });
    useHotkeys("s", () => handleToolChange("select"), { preventDefault: true });
    useHotkeys("a", () => handleToolChange("areaSelect"), {
        preventDefault: true,
    });
    useHotkeys(
        "c",
        () => {
            handleToolChange("connect");
            if (selectedNodeId) setPendingConnectSource(selectedNodeId);
        },
        { preventDefault: true },
        [selectedNodeId, handleToolChange, setPendingConnectSource],
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
