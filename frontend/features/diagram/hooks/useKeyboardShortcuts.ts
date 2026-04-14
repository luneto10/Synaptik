import { useHotkeys } from "react-hotkeys-hook";
import { useDiagramStore } from "../store/diagramStore";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

interface Options {
    handleToolChange: (tool: DiagramTool) => void;
    setTableDialogOpen: (open: boolean) => void;
    setPendingConnectSource: (id: string | null) => void;
}

const history = () => useDiagramStore.temporal.getState();

const HOTKEY_OPTIONS = {
    preventDefault: true,
    enableOnFormTags: false, 
} as const;

export function useKeyboardShortcuts({
    handleToolChange,
    setTableDialogOpen,
    setPendingConnectSource,
}: Options) {
    const selectedNodeId = useDiagramStore((s) => s.nodes.find((n) => n.selected)?.id);

    useHotkeys("ctrl+z", () => history().undo(), HOTKEY_OPTIONS);
    useHotkeys("ctrl+shift+z", () => history().redo(), HOTKEY_OPTIONS);

    useHotkeys("t", () => setTableDialogOpen(true), HOTKEY_OPTIONS);
    useHotkeys("s", () => handleToolChange("select"), HOTKEY_OPTIONS);
    useHotkeys("a", () => handleToolChange("areaSelect"), HOTKEY_OPTIONS);

    useHotkeys(
        "c",
        () => {
            handleToolChange("connect");
            if (selectedNodeId) setPendingConnectSource(selectedNodeId);
        },
        HOTKEY_OPTIONS,
        [selectedNodeId],
    );

    return {
        handleUndo: () => history().undo(),
        handleRedo: () => history().redo(),
    };
}
