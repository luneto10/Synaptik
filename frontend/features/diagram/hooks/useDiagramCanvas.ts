import { useEffect, useRef, useState } from "react";
import { SelectionMode } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import { useDiagramActions } from "./useDiagramActions";
import { useConnectMode } from "./useConnectMode";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useFlowCanvasChangeHandlers } from "./useFlowCanvasChangeHandlers";
import { useGrabMode } from "./useGrabMode";
import { useSelectedNodeIds } from "./useSelectedNodeId";
import { useDiagramUiState } from "./useDiagramUiState";
import { useIsolatedEdges } from "./useIsolatedEdges";
import type { DiagramTool } from "../components/canvas/LeftToolbox";
import { REFLOW_DELAY_MS } from "../constants";

export function useDiagramCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeTool, setActiveTool] = useState<DiagramTool>("select");

    const nodes = useDiagramStore((s) => s.nodes);
    const edges = useDiagramStore((s) => s.edges);
    const onNodesChange = useDiagramStore((s) => s.onNodesChange);
    const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);

    const {
        handleBeforeDelete,
        handleNodesChange,
        handleEdgesChange,
        handleNodeDragStart,
        handleNodeDragStop,
        handleSelectionDragStart,
        handleSelectionDragStop,
    } = useFlowCanvasChangeHandlers({ onNodesChange, onEdgesChange });

    const {
        pendingConn,
        setPendingConn,
        pendingConnectSource,
        setPendingConnectSource,
        handleConnect,
        handleConnectStart,
        handleConnectEnd,
        handleNodeClick,
        handleConfirmRelation,
        displayNodes,
    } = useConnectMode(activeTool);

    const {
        tableDialogOpen,
        searchOpen,
        setSearchOpen,
        searchTargetId,
        setSearchTargetId,
        showMinimap,
        isolateConnections,
        handleToolChange,
        handleTableDialogClose,
        handleToggleMinimap,
        handleToggleSearch,
        handleToggleIsolateConnections,
        handleSearchSelect,
    } = useDiagramUiState({ setActiveTool, setPendingConnectSource });

    const selectedNodeIds = useSelectedNodeIds();

    const {
        isGrabbing,
        onMouseDownCapture,
        onMouseUpCapture,
        onMouseMoveCapture,
    } = useGrabMode({ containerRef, activeTool, setActiveTool });

    const { isPending, handleSave, handleLoadExample, handleAutoLayout } =
        useDiagramActions();

    const displayEdges = useIsolatedEdges(
        edges,
        selectedNodeIds,
        isolateConnections,
    );

    const { handleUndo, handleRedo } = useKeyboardShortcuts({
        handleToolChange,
        setTableDialogOpen: handleTableDialogClose,
        setPendingConnectSource,
        handleToggleMinimap,
        handleAutoLayout,
        handleToggleSearch,
        handleToggleIsolateConnections,
    });

    // Refocus the canvas whenever a dialog closes so keyboard shortcuts work.
    useEffect(() => {
        if (tableDialogOpen || pendingConn) return;
        const id = setTimeout(
            () => containerRef.current?.focus(),
            REFLOW_DELAY_MS,
        );
        return () => clearTimeout(id);
    }, [tableDialogOpen, pendingConn]);

    useEffect(() => () => endDiagramHistoryGestureIfActive(), []);

    return {
        containerRef,
        nodes,
        edges,
        displayNodes,
        displayEdges,
        activeTool,
        isGrabbing,
        isPending,
        tableDialogOpen,
        pendingConn,
        pendingConnectSource,
        showMinimap,
        searchOpen,
        searchTargetId,
        isolateConnections,
        handleNodesChange,
        handleEdgesChange,
        handleBeforeDelete,
        handleNodeDragStart,
        handleNodeDragStop,
        handleSelectionDragStart,
        handleSelectionDragStop,
        handleConnect,
        handleConnectStart,
        handleConnectEnd,
        handleNodeClick,
        handleConfirmRelation,
        handleToolChange,
        handleTableDialogClose,
        handleToggleMinimap,
        handleToggleSearch,
        handleToggleIsolateConnections,
        handleSearchSelect,
        handleUndo,
        handleRedo,
        handleSave,
        handleAutoLayout,
        handleLoadExample,
        onMouseDownCapture,
        onMouseUpCapture,
        onMouseMoveCapture,
        setPendingConn,
        setSearchOpen,
        setSearchTargetId,
        SelectionMode,
    };
}
