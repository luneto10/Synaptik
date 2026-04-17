import { useCallback, useState } from "react";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

type UiStateArgs = {
    setActiveTool: (tool: DiagramTool) => void;
    setPendingConnectSource: (id: string | null) => void;
};

/**
 * Owns transient canvas UI flags (dialog, minimap, search, isolate) and the
 * tool-change orchestration. `activeTool` state itself lives in the caller so
 * `useConnectMode` can read it without a circular hook dependency.
 */
export function useDiagramUiState({
    setActiveTool,
    setPendingConnectSource,
}: UiStateArgs) {
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [showMinimap, setShowMinimap] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTargetId, setSearchTargetId] = useState<string | null>(null);

    const handleToolChange = useCallback(
        (tool: DiagramTool) => {
            setActiveTool(tool);
            if (tool !== "connect") setPendingConnectSource(null);
            if (tool === "addTable") setTableDialogOpen(true);
        },
        [setActiveTool, setPendingConnectSource],
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
