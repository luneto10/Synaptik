"use client";

import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    addEdge,
    Node,
    Edge,
    Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function App() {
    const [nodes, setNodes, onChangeNodes] = useNodesState<Node>([]);
    const [edges, setEdges, onChangeEdges] = useEdgesState<Edge>([]);
    const onConnect = (params: Connection) =>
        setEdges((eds) => addEdge(params, eds));

    const handleAddNode = () => {
        setNodes((nds) => [
            ...nds,
            {
                id: `${nds.length + 1}`,
                position: { x: 100 + nds.length, y: 100 + nds.length * 100 },
                data: { label: `Node ${nds.length + 1}` },
                type: "default",
            },
        ]);
    };

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
            }}
        >
            <ReactFlowProvider>
                <button
                    style={{
                        position: "absolute",
                        zIndex: 10,
                        left: 10,
                        top: 10,
                        padding: "8px 16px",
                        backgroundColor: "#1a192b",
                        color: "#fff",
                    }}
                    onClick={handleAddNode}
                >
                    Create Node
                </button>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onChangeNodes}
                    onEdgesChange={onChangeEdges}
                    onConnect={onConnect}
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
}

export default App;
