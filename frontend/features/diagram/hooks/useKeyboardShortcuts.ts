import { useHotkeys } from "react-hotkeys-hook";
import { useDiagramStore } from "../store/diagramStore";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

interface Options {
    handleToolChange: (tool: DiagramTool) => void;
    setTableDialogOpen: (open: boolean) => void;
    setPendingConnectSource: (id: string | null) => void;
    undo: () => void;
    redo: () => void;
}

export function useKeyboardShortcuts({
    handleToolChange,
    setTableDialogOpen,
    setPendingConnectSource,
    undo,
    redo,
}: Options) {
    const selectedNodeId = useDiagramStore(
        (s) => s?.nodes?.find((n) => n.selected)?.id,
    );

    useHotkeys("mod+z", undo, { preventDefault: true });
    useHotkeys("mod+shift+z, mod+y", redo, { preventDefault: true });

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
        handleUndo: undo,
        handleRedo: redo,
    };
}
