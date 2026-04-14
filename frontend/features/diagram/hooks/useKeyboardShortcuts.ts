import { useCallback } from "react";
import { useDiagramStore } from "../store/diagramStore";
import type { DiagramTool } from "../components/LeftToolbox";

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
    const nodes = useDiagramStore((s) => s.nodes);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            )
                return;

            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                useDiagramStore.temporal.getState().undo();
                return;
            }
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                useDiagramStore.temporal.getState().redo();
                return;
            }

            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                const key = e.key.toLowerCase();

                if (key === "t") {
                    e.preventDefault();
                    setTableDialogOpen(true);
                    return;
                }
                if (key === "c") {
                    handleToolChange("connect");
                    const selected = nodes.find((n) => n.selected);
                    if (selected) setPendingConnectSource(selected.id);
                    return;
                }

                const toolMap: Record<string, DiagramTool> = {
                    s: "select",
                    a: "areaSelect",
                };
                const tool = toolMap[key];
                if (tool) handleToolChange(tool);
            }
        },
        [handleToolChange, setTableDialogOpen, setPendingConnectSource, nodes],
    );

    return { handleKeyDown };
}
