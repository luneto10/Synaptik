"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    SelectionMode,
    ControlButton,
} from "@xyflow/react";
import { Map } from "lucide-react";
import { useDiagramStore } from "./store/diagramStore";
import { endDiagramHistoryGestureIfActive } from "./store/diagramHistory";
import { nodeTypes } from "./nodes";
import FlowToolbar from "./components/canvas/FlowToolbar";
import LeftToolbox, { type DiagramTool } from "./components/canvas/LeftToolbox";
import NewTableDialog from "./components/canvas/NewTableDialog";
import { TableSearch } from "./components/canvas/TableSearch";
import { FitViewTrigger } from "./components/canvas/FitViewTrigger";
import ConnectionDialog from "./components/edges/ConnectionDialog";
import { EdgeMarkerDefs } from "./components/edges/EdgeMarkerDefs";
import { useDiagramActions } from "./hooks/useDiagramActions";
import { useConnectMode } from "./hooks/useConnectMode";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFlowCanvasChangeHandlers } from "./hooks/useFlowCanvasChangeHandlers";
import { useGrabMode } from "./hooks/useGrabMode";
import {
    edgeTypes,
    CONNECTION_LINE_STYLE,
    FIT_VIEW_OPTIONS,
    DEFAULT_EDGE_OPTIONS,
} from "./FlowCanvas.constants";
import { DIAGRAM_COLORS, REFLOW_DELAY_MS } from "./constants";
import { cn } from "@/lib/utils";

export function DiagramCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);

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

    const [activeTool, setActiveTool] = useState<DiagramTool>("select");
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [showMinimap, setShowMinimap] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTargetId, setSearchTargetId] = useState<string | null>(null);

    const { isGrabbing, onMouseDownCapture, onMouseUpCapture, onMouseMoveCapture } =
        useGrabMode({ containerRef, activeTool, setActiveTool });

    const { isPending, handleSave, handleLoadExample, handleAutoLayout } =
        useDiagramActions();

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

    const handleToolChange = useCallback(
        (tool: DiagramTool) => {
            setActiveTool(tool);
            if (tool !== "connect") setPendingConnectSource(null);
            if (tool === "addTable") setTableDialogOpen(true);
        },
        [setPendingConnectSource],
    );

    const handleTableDialogClose = useCallback((open: boolean) => {
        setTableDialogOpen(open);
        if (!open) {
            setActiveTool("select");
            endDiagramHistoryGestureIfActive();
        }
    }, []);

    const handleToggleMinimap = useCallback(() => setShowMinimap((v) => !v), []);
    const handleToggleSearch = useCallback(() => setSearchOpen((v) => !v), []);

    const handleSearchSelect = useCallback((nodeId: string) => {
        setSearchOpen(false);
        setSearchTargetId(nodeId);
    }, []);

    const isMac = useMemo(
        () =>
            typeof navigator !== "undefined" &&
            /mac|iphone|ipad/i.test(navigator.platform ?? navigator.userAgent),
        [],
    );

    const { handleUndo, handleRedo } = useKeyboardShortcuts({
        handleToolChange,
        setTableDialogOpen,
        setPendingConnectSource,
        handleToggleMinimap,
        handleAutoLayout,
        handleToggleSearch,
    });

    // Refocus the canvas whenever a dialog closes so keyboard shortcuts work.
    useEffect(() => {
        if (tableDialogOpen || pendingConn) return;
        const id = setTimeout(() => containerRef.current?.focus(), REFLOW_DELAY_MS);
        return () => clearTimeout(id);
    }, [tableDialogOpen, pendingConn]);

    useEffect(() => () => endDiagramHistoryGestureIfActive(), []);

    return (
        <div
            ref={containerRef}
            className="w-screen h-screen flex flex-col overflow-hidden bg-background"
            tabIndex={-1}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDownCapture={onMouseDownCapture}
            onMouseUpCapture={onMouseUpCapture}
            onMouseMoveCapture={onMouseMoveCapture}
        >
            <FlowToolbar
                nodeCount={nodes.length}
                edgeCount={edges.length}
                isPending={isPending}
                onSave={handleSave}
                onAutoLayout={handleAutoLayout}
                onLoadExample={handleLoadExample}
                onSearch={handleToggleSearch}
                isMac={isMac}
            />

            <div
                className="flex-1 relative bg-background overflow-hidden"
                style={isGrabbing ? { cursor: "grabbing" } : undefined}
            >
                <LeftToolbox
                    activeTool={activeTool}
                    onToolChange={handleToolChange}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                />

                {activeTool === "connect" && pendingConnectSource && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20
                                    text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full
                                    shadow-lg pointer-events-none select-none">
                        Click a second table to connect
                    </div>
                )}

                <ReactFlow
                    nodes={displayNodes}
                    edges={edges}
                    onBeforeDelete={handleBeforeDelete}
                    onNodesChange={handleNodesChange}
                    onNodeDragStart={handleNodeDragStart}
                    onNodeDragStop={handleNodeDragStop}
                    onSelectionDragStart={handleSelectionDragStart}
                    onSelectionDragStop={handleSelectionDragStop}
                    onEdgesChange={handleEdgesChange}
                    onConnect={handleConnect}
                    onConnectStart={handleConnectStart}
                    onConnectEnd={handleConnectEnd}
                    onNodeClick={handleNodeClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={FIT_VIEW_OPTIONS}
                    minZoom={0.2}
                    maxZoom={2}
                    selectionOnDrag={activeTool === "areaSelect"}
                    panOnDrag={
                        activeTool === "areaSelect" || activeTool === "connect"
                            ? [1, 2]
                            : [0, 1, 2]
                    }
                    selectionMode={SelectionMode.Partial}
                    deleteKeyCode={["Delete", "Backspace"]}
                    connectionLineStyle={CONNECTION_LINE_STYLE}
                    defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                    style={{ width: "100%", height: "100%" }}
                    proOptions={{ hideAttribution: true }}
                >
                    <EdgeMarkerDefs />
                    <FitViewTrigger
                        nodeId={searchTargetId}
                        onDone={() => setSearchTargetId(null)}
                    />

                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={2}
                        color="var(--canvas-dot-color)"
                    />

                    <Controls
                        orientation="horizontal"
                        position="bottom-right"
                        className="bg-card! border! border-border! rounded-lg! shadow-md! flex-row!
                                   [&>button]:bg-transparent! [&>button]:text-foreground! [&>button]:border-0!
                                   [&>button:hover]:bg-muted! [&>button]:w-8! [&>button]:h-8!"
                    >
                        <ControlButton
                            onClick={handleToggleMinimap}
                            title="Toggle minimap"
                            className={cn(showMinimap && "text-indigo-400!")}
                        >
                            <Map className="w-3.5 h-3.5" />
                        </ControlButton>
                    </Controls>

                    {showMinimap && (
                        <MiniMap
                            nodeColor={DIAGRAM_COLORS.minimap}
                            maskColor="rgba(0,0,0,0.4)"
                            position="bottom-right"
                            style={{ bottom: 56, right: 12 }}
                            className="bg-card! border! border-border! rounded-lg shadow-sm"
                            pannable
                            zoomable
                        />
                    )}
                </ReactFlow>
            </div>

            <NewTableDialog
                open={tableDialogOpen}
                onOpenChange={handleTableDialogClose}
            />

            <ConnectionDialog
                open={!!pendingConn}
                connection={pendingConn}
                onConfirm={handleConfirmRelation}
                onCancel={() => setPendingConn(null)}
            />

            <TableSearch
                open={searchOpen}
                onOpenChange={setSearchOpen}
                onSelect={handleSearchSelect}
            />
        </div>
    );
}
