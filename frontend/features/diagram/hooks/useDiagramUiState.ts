import { useCallback, useState } from "react";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import {
    TOOLS,
    type DiagramTool,
    type DiagramToggle,
    type ToolValue,
} from "../components/canvas/LeftToolbox";

type UiStateArgs = {
    setActiveTool: (tool: DiagramTool) => void;
    setPendingConnectSource: (id: string | null) => void;
    selectedNodeId: string | undefined;
};

/**
 * Owns transient canvas UI flags (dialog, minimap, search, toggles) and the
 * tool-action dispatch. `activeTool` state itself lives in the caller so
 * `useConnectMode` can read it without a circular hook dependency.
 *
 * `handleToolAction` is the single entry point for the toolbox and keyboard
 * shortcuts: it looks up the descriptor in `TOOLS` and routes to the correct
 * behavior (exclusive tool vs. independent toggle).
 */
export function useDiagramUiState({
    setActiveTool,
    setPendingConnectSource,
    selectedNodeId,
}: UiStateArgs) {
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [showMinimap, setShowMinimap] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTargetId, setSearchTargetId] = useState<string | null>(null);
    const [toggleState, setToggleState] = useState<Record<DiagramToggle, boolean>>({
        isolateConnections: false,
    });

    const handleToolAction = useCallback(
        (value: ToolValue) => {
            const descriptor = TOOLS.find((t) => t.value === value);
            if (!descriptor) return;

            if (descriptor.kind === "toggle") {
                setToggleState((prev) => ({
                    ...prev,
                    [descriptor.value]: !prev[descriptor.value],
                }));
                return;
            }

            setActiveTool(descriptor.value);

            // Side-effect: Auto-fill connection source if exactly one node is selected.
            setPendingConnectSource(
                descriptor.value === "connect" ? (selectedNodeId ?? null) : null,
            );

            // Side-effect: Trigger the table configuration dialog.
            if (descriptor.value === "addTable") setTableDialogOpen(true);
        },
        [setActiveTool, setPendingConnectSource, selectedNodeId],
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
        toggles: toggleState,
        isolateConnections: toggleState.isolateConnections,
        handleToolAction,
        handleTableDialogClose,
        handleToggleMinimap,
        handleToggleSearch,
        handleSearchSelect,
    };
}
