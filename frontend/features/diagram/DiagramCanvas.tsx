"use client";

import type { CSSProperties } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    ControlButton,
    useStore,
} from "@xyflow/react";
import { SelectedCountContext } from "./components/canvas/SelectedCountContext";
import { Map } from "lucide-react";
import { nodeTypes } from "./nodes";
import FlowToolbar from "./components/canvas/FlowToolbar";
import LeftToolbox from "./components/canvas/LeftToolbox";
import NewTableDialog from "./components/canvas/NewTableDialog";
import { TableSearch } from "./components/canvas/TableSearch";
import { FitViewTrigger } from "./components/canvas/FitViewTrigger";
import { SelectionResizer } from "./components/canvas/SelectionResizer";
import { PanOnAuxDrag } from "./components/canvas/PanOnAuxDrag";
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

const DELETE_KEYS = ["Delete", "Backspace"];
const PRO_OPTIONS = { hideAttribution: true };
const MINIMAP_STYLE: CSSProperties = { bottom: 56, right: 12 };
const PAN_ON_DRAG_MIDDLE_RIGHT: number[] = [1, 2];

// Computed once here so every TableNode gets O(1) context read instead of O(N) filter.
const selectSelectedCount = (s: { nodes: { selected?: boolean }[] }) => {
    let n = 0;
    for (const node of s.nodes) if (node.selected) n++;
    return n;
};


export function DiagramCanvas() {
    const selectedCount = useStore(selectSelectedCount);
    const {
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
    } = useDiagramCanvas();

    return (
        <SelectedCountContext.Provider value={selectedCount}>
        <div
            ref={containerRef}
            className="w-screen h-screen flex flex-col overflow-hidden bg-background select-none [&_input]:select-text [&_textarea]:select-text **:[[contenteditable]]:select-text"
            tabIndex={-1}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDownCapture={onMouseDownCapture}
            onMouseUpCapture={onMouseUpCapture}
            onMouseMoveCapture={onMouseMoveCapture}
        >
            <FlowToolbar
                nodeCount={nodeCount}
                edgeCount={edgeCount}
                isPending={isPending}
                onSave={handleSave}
                onAutoLayout={handleAutoLayout}
                onLoadExample={handleLoadExample}
                onSearch={handleToggleSearch}
            />

            <div
                className={cn(
                    "flex-1 relative bg-background overflow-hidden",
                    isGrabbing && "cursor-grabbing",
                )}
            >
                <LeftToolbox
                    activeTool={activeTool}
                    toggles={toggles}
                    onToolAction={handleToolAction}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
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

                {activeTool === "addBox" && !addBoxPreview && (
                    <div
                        className="absolute top-3 left-1/2 -translate-x-1/2 z-20
                                    text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full
                                    shadow-lg pointer-events-none select-none"
                    >
                        Drag to draw a category box
                    </div>
                )}

                {addBoxPreview && (
                    <div
                        className="fixed z-30 pointer-events-none rounded-xl border-2 border-dashed border-indigo-500/70 bg-indigo-500/10"
                        style={{
                            left: addBoxPreview.x,
                            top: addBoxPreview.y,
                            width: addBoxPreview.w,
                            height: addBoxPreview.h,
                        }}
                    />
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
                    elevateNodesOnSelect={false}
                    selectionOnDrag={activeTool === "select"}
                    panOnDrag={PAN_ON_DRAG_MIDDLE_RIGHT}
                    selectionMode={SelectionMode.Partial}
                    deleteKeyCode={DELETE_KEYS}
                    connectionLineStyle={CONNECTION_LINE_STYLE}
                    defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                    className="w-full h-full"
                    proOptions={PRO_OPTIONS}
                >
                    <EdgeMarkerDefs />
                    <PanOnAuxDrag />
                    <SelectionResizer />
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
                            style={MINIMAP_STYLE}
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
        </SelectedCountContext.Provider>
    );
}
