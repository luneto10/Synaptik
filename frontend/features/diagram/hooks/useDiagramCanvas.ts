import { useEffect, useRef, useState } from "react";
import { SelectionMode } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "../store/diagramHistory";
import { useDiagramActions } from "./useDiagramActions";
import { useConnectMode } from "./useConnectMode";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useFlowCanvasChangeHandlers } from "./useFlowCanvasChangeHandlers";
import { useGrabMode } from "./useGrabMode";
import { useAddBoxMode } from "./useAddBoxMode";
import { useCanvasPointer } from "./useCanvasPointer";
import { useSelectedNodeIds } from "./useSelectedNodeId";
import { useDiagramUiState } from "./useDiagramUiState";
import { useIsolatedEdges } from "./useIsolatedEdges";
import type { DiagramTool } from "../components/canvas/LeftToolbox";
import { REFLOW_DELAY_MS } from "../constants";

export function useDiagramCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeTool, setActiveTool] = useState<DiagramTool>("select");

    const nodeCount = useDiagramStore((s) => s.nodes.length);
    const edgeCount = useDiagramStore((s) => s.edges.length);
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

    const selectedNodeIds = useSelectedNodeIds();
    const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : undefined;

    const {
        tableDialogOpen,
        searchOpen,
        setSearchOpen,
        searchTargetId,
        setSearchTargetId,
        showMinimap,
        toggles,
        isolateConnections,
        handleToolAction,
        handleTableDialogClose,
        handleToggleMinimap,
        handleToggleSearch,
        handleSearchSelect,
    } = useDiagramUiState({
        setActiveTool,
        setPendingConnectSource,
        selectedNodeId,
    });

    const {
        isGrabbing,
        onMouseDownCapture,
        onMouseUpCapture,
        onMouseMoveCapture,
    } = useGrabMode({ containerRef, activeTool, setActiveTool });

    const { preview: addBoxPreview } = useAddBoxMode({
        containerRef,
        activeTool,
        setActiveTool,
    });

    const { getFlowPosition: getPasteAnchor } = useCanvasPointer(containerRef);

    const { isPending, handleSave, handleLoadExample, handleAutoLayout } =
        useDiagramActions();

    const displayEdges = useIsolatedEdges(
        edges,
        selectedNodeIds,
        isolateConnections,
    );

    const { handleUndo, handleRedo } = useKeyboardShortcuts({
        handleToolAction,
        setTableDialogOpen: handleTableDialogClose,
        setPendingConnectSource,
        handleToggleMinimap,
        handleAutoLayout,
        handleToggleSearch,
        getPasteAnchor,
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
        nodeCount,
        edgeCount,
        displayNodes,
        displayEdges,
        activeTool,
        toggles,
        addBoxPreview,
        isGrabbing,
        isPending,
        tableDialogOpen,
        pendingConn,
        pendingConnectSource,
        showMinimap,
        searchOpen,
        searchTargetId,
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
        handleToolAction,
        handleTableDialogClose,
        handleToggleMinimap,
        handleToggleSearch,
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
