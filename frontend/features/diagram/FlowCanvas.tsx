"use client";

import { useCallback, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDiagramStore } from "./store/diagramStore";
import { nodeTypes } from "./nodes";
import { saveDiagram } from "./api/diagram.api";
import { useMutation } from "@tanstack/react-query";
import NewTableDialog from "./components/NewTableDialog";
import FlowToolbar from "./components/FlowToolbar";

export default function FlowCanvas() {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
        useDiagramStore();

    const [dialogOpen, setDialogOpen] = useState(false);

    const { mutate: save, isPending } = useMutation({
        mutationFn: saveDiagram,
        onSuccess: (data) => {
            console.log("SQL from Go:\n", data.sql);
        },
        onError: (error) => {
            console.error("Save failed:", error);
        },
    });

    const handleSave = useCallback(() => {
        const tables = nodes.map((n) => n.data);
        save({ tables, edges });
    }, [nodes, edges, save]);

    return (
        <div className="w-full h-screen flex flex-col bg-slate-50">
            {/* ── Toolbar ── */}
            <FlowToolbar
                nodeCount={nodes.length}
                edgeCount={edges.length}
                isPending={isPending}
                onNewTable={() => setDialogOpen(true)}
                onSave={handleSave}
            />

            {/* ── Canvas ── */}
            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    defaultEdgeOptions={{
                        style: { stroke: "#6366f1", strokeWidth: 2 },
                        animated: true,
                    }}
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1}
                        color="#e2e8f0"
                    />
                    <Controls className="border border-slate-200 rounded-lg shadow-sm" />
                    <MiniMap
                        className="border border-slate-200 rounded-lg shadow-sm"
                        nodeColor="#6366f1"
                        maskColor="rgba(248,250,252,0.7)"
                    />
                </ReactFlow>
            </div>

            {/* ── New table dialog ── */}
            <NewTableDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
