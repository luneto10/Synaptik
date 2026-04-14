"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    SelectionMode,
    ControlButton,
    ReactFlowProvider,
    type EdgeTypes,
} from "@xyflow/react";
import { useDiagramStore } from "./store/diagramStore";
import { nodeTypes } from "./nodes";
import FlowToolbar from "./components/FlowToolbar";
import LeftToolbox, { type DiagramTool } from "./components/LeftToolbox";
import NewTableDialog from "./components/NewTableDialog";
import ConnectionDialog from "./components/ConnectionDialog";
import RelationEdge from "./components/RelationEdge";
import { EdgeMarkerDefs } from "./components/EdgeMarkerDefs";
import { Map } from "lucide-react";
import { useDiagramActions } from "./hooks/useDiagramActions";
import { useConnectMode } from "./hooks/useConnectMode";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import type { RelationshipType } from "./types/flow.types";

// ── Module-level constants (stable references, never cause re-renders) ────────

const edgeTypes: EdgeTypes = { relation: RelationEdge as EdgeTypes[string] };

const CONNECTION_LINE_STYLE = { stroke: "#6366f1", strokeWidth: 2 };
const FIT_VIEW_OPTIONS = { padding: 0.3 };
const DEFAULT_EDGE_OPTIONS = {
    type: "relation",
    data: {
        relationshipType: "one-to-many" as RelationshipType,
        sourceColumnId: "",
        targetColumnId: "",
    },
};

// ── Inner canvas (needs useReactFlow) ────────────────────────────────────────

function DiagramCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);

    const nodes = useDiagramStore((s) => s.nodes);
    const edges = useDiagramStore((s) => s.edges);
    const onNodesChange = useDiagramStore((s) => s.onNodesChange);
    const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);

    const [activeTool, setActiveTool] = useState<DiagramTool>("select");
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);

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
        if (!open) setActiveTool("select");
    }, []);

    const { handleKeyDown } = useKeyboardShortcuts({
        handleToolChange,
        setTableDialogOpen,
        setPendingConnectSource,
    });

    const handleUndo = useCallback(
        () => useDiagramStore.temporal.getState().undo(),
        [],
    );
    const handleRedo = useCallback(
        () => useDiagramStore.temporal.getState().redo(),
        [],
    );

    // Refocus the canvas whenever a dialog closes so keyboard shortcuts work.
    useEffect(() => {
        if (!tableDialogOpen && !pendingConn) {
            const id = setTimeout(() => containerRef.current?.focus(), 50);
            return () => clearTimeout(id);
        }
    }, [tableDialogOpen, pendingConn]);

    return (
        <div
            ref={containerRef}
            className="w-screen h-screen flex flex-col overflow-hidden bg-background"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <FlowToolbar
                nodeCount={nodes.length}
                edgeCount={edges.length}
                isPending={isPending}
                onSave={handleSave}
                onAutoLayout={handleAutoLayout}
                onLoadExample={handleLoadExample}
            />

            <div className="flex-1 relative bg-background overflow-hidden">
                <LeftToolbox
                    activeTool={activeTool}
                    onToolChange={handleToolChange}
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

                <ReactFlow
                    nodes={displayNodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
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
                        activeTool !== "areaSelect" && activeTool !== "connect"
                    }
                    selectionMode={SelectionMode.Partial}
                    deleteKeyCode={["Delete", "Backspace"]}
                    connectionLineStyle={CONNECTION_LINE_STYLE}
                    defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                    style={{ width: "100%", height: "100%" }}
                    proOptions={{ hideAttribution: true }}
                >
                    <EdgeMarkerDefs />

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
                            onClick={() => setShowMinimap((v) => !v)}
                            title="Toggle minimap"
                            className={showMinimap ? "text-indigo-400!" : ""}
                        >
                            <Map className="w-3.5 h-3.5" />
                        </ControlButton>
                    </Controls>

                    {showMinimap && (
                        <MiniMap
                            nodeColor="#6366f1"
                            maskColor="rgba(0,0,0,0.4)"
                            position="bottom-right"
                            style={{ bottom: 56, right: 12 }}
                            className="bg-card! border! border-border! rounded-lg shadow-sm"
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
        </div>
    );
}

export default function FlowCanvas() {
    return (
        <ReactFlowProvider>
            <DiagramCanvas />
        </ReactFlowProvider>
    );
}
