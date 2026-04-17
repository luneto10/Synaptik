"use client";

import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    ControlButton,
} from "@xyflow/react";
import { Map } from "lucide-react";
import { nodeTypes } from "./nodes";
import FlowToolbar from "./components/canvas/FlowToolbar";
import LeftToolbox from "./components/canvas/LeftToolbox";
import NewTableDialog from "./components/canvas/NewTableDialog";
import { TableSearch } from "./components/canvas/TableSearch";
import { FitViewTrigger } from "./components/canvas/FitViewTrigger";
import ConnectionDialog from "./components/edges/ConnectionDialog";
import { EdgeMarkerDefs } from "./components/edges/EdgeMarkerDefs";
import { useDiagramCanvas } from "./hooks/useDiagramCanvas";
import {
    edgeTypes,
    CONNECTION_LINE_STYLE,
    FIT_VIEW_OPTIONS,
    DEFAULT_EDGE_OPTIONS,
} from "./FlowCanvas.constants";
import { DIAGRAM_COLORS } from "./constants";
import { cn } from "@/lib/utils";

export function DiagramCanvas() {
    const {
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
    } = useDiagramCanvas();

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
                    isolateConnections={isolateConnections}
                    onToggleIsolateConnections={handleToggleIsolateConnections}
                />

                {activeTool === "connect" && pendingConnectSource && (
                    <div
                        className="absolute top-3 left-1/2 -translate-x-1/2 z-20
                                    text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full
                                    shadow-lg pointer-events-none select-none"
                    >
                        Click a second table to connect
                    </div>
                )}

                <ReactFlow
                    nodes={displayNodes}
                    edges={displayEdges}
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
