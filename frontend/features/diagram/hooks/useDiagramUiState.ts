import { useCallback, useState } from "react";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

type UiStateArgs = {
    activeTool: DiagramTool;
    setActiveTool: (tool: DiagramTool) => void;
    setPendingConnectSource: (id: string | null) => void;
    selectedNodeId: string | undefined;
};

/**
 * Owns transient canvas UI flags (dialog, minimap, search, isolate) and the
 * tool-change orchestration. `activeTool` state itself lives in the caller so
 * `useConnectMode` can read it without a circular hook dependency.
 */
export function useDiagramUiState({
    activeTool,
    setActiveTool,
    setPendingConnectSource,
    selectedNodeId,
}: UiStateArgs) {
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [showMinimap, setShowMinimap] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTargetId, setSearchTargetId] = useState<string | null>(null);

    const handleToolChange = useCallback(
        (tool: DiagramTool) => {
            // Isolate mode toggles off if clicked while active; others are standard switches.
            const nextTool =
                tool === "isolateConnections" && activeTool === "isolateConnections"
                    ? "select"
                    : tool;

            setActiveTool(nextTool);

            // Side-effect: Auto-fill connection source if exactly one node is selected.
            setPendingConnectSource(
                nextTool === "connect" ? (selectedNodeId ?? null) : null,
            );

            // Side-effect: Trigger the table configuration dialog.
            if (nextTool === "addTable") setTableDialogOpen(true);
        },
        [activeTool, setActiveTool, setPendingConnectSource, selectedNodeId],
    );

    const handleTableDialogClose = useCallback(
        (open: boolean) => {
            setTableDialogOpen(open);
            if (!open) {
                setActiveTool("select");
                endDiagramHistoryGestureIfActive();
            }
        },
        [setActiveTool],
    );

    const handleToggleMinimap = useCallback(
        () => setShowMinimap((v) => !v),
        [],
    );
    const handleToggleSearch = useCallback(() => setSearchOpen((v) => !v), []);
    const handleSearchSelect = useCallback((nodeId: string) => {
        setSearchOpen(false);
        setSearchTargetId(nodeId);
    }, []);

    return {
        tableDialogOpen,
        setTableDialogOpen,
        showMinimap,
        searchOpen,
        setSearchOpen,
        searchTargetId,
        setSearchTargetId,
        handleToolChange,
        handleTableDialogClose,
        handleToggleMinimap,
        handleToggleSearch,
        handleSearchSelect,
    };
}
