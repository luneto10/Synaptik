"use client";

import { useCallback, useState } from "react";
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
import type { RelationEdgeData } from "./types/flow.types";

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

    const [activeTool, setActiveTool] = useState<DiagramTool>("select");
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [pendingConn, setPendingConn] = useState<Connection | null>(null);
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

    // Intercept connection → open dialog
    const handleConnect = useCallback((conn: Connection) => {
        setPendingConn(conn);
    }, []);

    const handleConfirmRelation = useCallback(
        (
            type: RelationshipType,
            sourceColId: string,
            targetColId: string,
            doCreateJunction: boolean,
        ) => {
            if (!pendingConn) return;

            if (doCreateJunction && pendingConn.source && pendingConn.target) {
                createJunctionTable(
                    pendingConn.source,
                    pendingConn.target,
                    sourceColId,
                    targetColId,
                );
            } else {
                addEdgeWithType(pendingConn, sourceColId, targetColId, type);
            }
            setPendingConn(null);
        },
        [pendingConn, addEdgeWithType, createJunctionTable],
    );

    const handleToolChange = useCallback((tool: DiagramTool) => {
        setActiveTool(tool);
        if (tool === "addTable") setTableDialogOpen(true);
    }, []);

    const handleTableDialogClose = useCallback((open: boolean) => {
        setTableDialogOpen(open);
        if (!open) setActiveTool("select");
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;
            const map: Record<string, DiagramTool> = {
                s: "select", t: "addTable", c: "connect", a: "areaSelect",
            };
            const tool = map[e.key.toLowerCase()];
            if (tool) handleToolChange(tool);
        },
        [handleToolChange],
    );

    return (
        <div
            className="w-screen h-screen flex flex-col overflow-hidden bg-background"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Top toolbar */}
            <FlowToolbar
                nodeCount={nodes.length}
                edgeCount={edges.length}
                isPending={isPending}
                onSave={handleSave}
                onAutoLayout={handleAutoLayout}
            />

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                <LeftToolbox
                    activeTool={activeTool}
                    onToolChange={handleToolChange}
                />

                <div className="flex-1 bg-background">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={handleConnect}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.3 }}
                        minZoom={0.2}
                        maxZoom={2}
                        selectionOnDrag={activeTool === "areaSelect"}
                        panOnDrag={activeTool !== "areaSelect"}
                        selectionMode={SelectionMode.Partial}
                        deleteKeyCode="Delete"
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
                        {/* Crow's foot SVG marker defs */}
                        <EdgeMarkerDefs />

                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1.5}
                            color="var(--border)"
                        />

                        <Controls className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground [&>button:hover]:bg-muted">
                            <ControlButton
                                onClick={() => setShowMinimap((v) => !v)}
                                title="Toggle minimap"
                            >
                                <Map className="w-3.5 h-3.5" />
                            </ControlButton>
                        </Controls>

                        {showMinimap && (
                            <MiniMap
                                nodeColor="#6366f1"
                                maskColor="rgba(0,0,0,0.4)"
                                className="!bg-card !border !border-border rounded-lg shadow-sm"
                            />
                        )}
                    </ReactFlow>
                </div>
            </div>

            {/* New table dialog */}
            <NewTableDialog
                open={tableDialogOpen}
                onOpenChange={handleTableDialogClose}
            />

            {/* Connection / relationship dialog */}
            <ConnectionDialog
                open={!!pendingConn}
                connection={pendingConn}
                onConfirm={handleConfirmRelation}
                onCancel={() => setPendingConn(null)}
            />
        </div>
    );
}

// Wrap with provider so useReactFlow works inside DiagramCanvas
export default function FlowCanvas() {
    return (
        <ReactFlowProvider>
            <DiagramCanvas />
        </ReactFlowProvider>
    );
}
