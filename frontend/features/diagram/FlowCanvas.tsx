"use client";

import { useCallback, useMemo, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    SelectionMode,
    ControlButton,
    useReactFlow,
    ReactFlowProvider,
    type EdgeTypes,
    type NodeMouseHandler,
} from "@xyflow/react";
import type { Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDiagramStore } from "./store/diagramStore";
import { nodeTypes } from "./nodes";
import { saveDiagram, SaveDiagramRequest } from "./api/diagram.api";
import { useMutation } from "@tanstack/react-query";
import FlowToolbar from "./components/FlowToolbar";
import LeftToolbox, { DiagramTool } from "./components/LeftToolbox";
import NewTableDialog from "./components/NewTableDialog";
import ConnectionDialog from "./components/ConnectionDialog";
import RelationEdge, { EdgeMarkerDefs } from "./components/RelationEdge";
import { Map } from "lucide-react";
import type { RelationEdgeData, TableNode } from "./types/flow.types";

const edgeTypes: EdgeTypes = { relation: RelationEdge as EdgeTypes[string] };

type RelationshipType = RelationEdgeData["relationshipType"];

// ── Inner canvas (needs useReactFlow) ────────────────────────────────────────

function DiagramCanvas() {
    const { fitView } = useReactFlow();

    const nodes = useDiagramStore((s) => s.nodes);
    const edges = useDiagramStore((s) => s.edges);
    const onNodesChange = useDiagramStore((s) => s.onNodesChange);
    const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
    const addEdgeWithType = useDiagramStore((s) => s.addEdgeWithType);
    const createJunctionTable = useDiagramStore((s) => s.createJunctionTable);

    // Undo / redo from temporal middleware
    const undo = useDiagramStore.temporal.getState().undo;
    const redo = useDiagramStore.temporal.getState().redo;

    const [activeTool, setActiveTool] = useState<DiagramTool>("select");
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [pendingConn, setPendingConn] = useState<Connection | null>(null);
    const [pendingConnectSource, setPendingConnectSource] = useState<string | null>(null);
    const [showMinimap, setShowMinimap] = useState(true);

    const { mutate: save, isPending } = useMutation({
        mutationFn: async (payload: SaveDiagramRequest) => {
            console.log("Payload →", JSON.stringify(payload, null, 2));
            return { sql: "" };
        },
        onSuccess: () => console.log("Mock save — backend not connected yet"),
    });

    const handleSave = useCallback(() => {
        const tables = nodes.map((n) => n.data);
        save({ tables, edges });
    }, [nodes, edges, save]);

    const handleAutoLayout = useCallback(() => {
        const COLS = 4;
        const GAP_X = 340;
        const GAP_Y = 260;
        const changes = nodes.map((n, i) => ({
            id: n.id,
            type: "position" as const,
            position: {
                x: 80 + (i % COLS) * GAP_X,
                y: 80 + Math.floor(i / COLS) * GAP_Y,
            },
        }));
        onNodesChange(changes);
        setTimeout(() => fitView({ padding: 0.3 }), 50);
    }, [nodes, onNodesChange, fitView]);

    // When dragging from a handle → open dialog
    const handleConnect = useCallback((conn: Connection) => {
        setPendingConn(conn);
    }, []);

    // Two-click connect mode: click first table, then second
    const handleNodeClick = useCallback<NodeMouseHandler>(
        (_, node) => {
            if (activeTool !== "connect") return;

            if (!pendingConnectSource) {
                setPendingConnectSource(node.id);
                return;
            }
            if (pendingConnectSource === node.id) {
                setPendingConnectSource(null);
                return;
            }
            // Both source and target selected — open dialog
            setPendingConn({
                source: pendingConnectSource,
                target: node.id,
                sourceHandle: null,
                targetHandle: null,
            });
            setPendingConnectSource(null);
        },
        [activeTool, pendingConnectSource],
    );

    const handleConfirmRelation = useCallback(
        (type: RelationshipType, fkName: string, doCreateJunction: boolean) => {
            if (!pendingConn) return;

            if (doCreateJunction && pendingConn.source && pendingConn.target) {
                createJunctionTable(pendingConn.source, pendingConn.target);
            } else {
                addEdgeWithType(pendingConn, fkName, type);
            }
            setPendingConn(null);
        },
        [pendingConn, addEdgeWithType, createJunctionTable],
    );

    const handleToolChange = useCallback((tool: DiagramTool) => {
        setActiveTool(tool);
        if (tool !== "connect") setPendingConnectSource(null);
        if (tool === "addTable") setTableDialogOpen(true);
    }, []);

    const handleTableDialogClose = useCallback((open: boolean) => {
        setTableDialogOpen(open);
        if (!open) setActiveTool("select");
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Undo / redo
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                undo();
                return;
            }
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                redo();
                return;
            }

            // Tool shortcuts
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                const map: Record<string, DiagramTool> = {
                    s: "select", t: "addTable", c: "connect", a: "areaSelect",
                };
                const tool = map[e.key.toLowerCase()];
                if (tool) handleToolChange(tool);
            }
        },
        [handleToolChange, undo, redo],
    );

    // Highlight the pending connect-source node visually
    const displayNodes = useMemo(
        () =>
            pendingConnectSource
                ? nodes.map((n) =>
                      n.id === pendingConnectSource ? { ...n, selected: true } : n,
                  )
                : nodes,
        [nodes, pendingConnectSource],
    );

    return (
        <div
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
            />

            <div className="flex-1 relative bg-background overflow-hidden">
                <LeftToolbox
                    activeTool={activeTool}
                    onToolChange={handleToolChange}
                    onUndo={undo}
                    onRedo={redo}
                />

                {/* Cursor hint when in two-click connect mode */}
                {activeTool === "connect" && pendingConnectSource && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20
                                    text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-lg
                                    pointer-events-none select-none">
                        Click a second table to connect
                    </div>
                )}

                <ReactFlow
                    nodes={displayNodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={handleConnect}
                    onNodeClick={handleNodeClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    minZoom={0.2}
                    maxZoom={2}
                    selectionOnDrag={activeTool === "areaSelect"}
                    panOnDrag={activeTool !== "areaSelect" && activeTool !== "connect"}
                    selectionMode={SelectionMode.Partial}
                    deleteKeyCode={["Delete", "Backspace"]}
                    connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
                    defaultEdgeOptions={{
                        type: "relation",
                        data: {
                            relationshipType: "one-to-many",
                            sourceColumnId: "",
                            targetColumnId: "",
                        },
                    }}
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
