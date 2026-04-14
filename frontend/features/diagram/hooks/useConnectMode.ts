import { useState, useCallback, useMemo } from "react";
import type { Connection, NodeMouseHandler } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import type { RelationshipType } from "../types/flow.types";
import type { DiagramTool } from "../components/LeftToolbox";

export function useConnectMode(activeTool: DiagramTool) {
    const nodes = useDiagramStore((s) => s.nodes);
    const addEdgeWithType = useDiagramStore((s) => s.addEdgeWithType);
    const createJunctionTable = useDiagramStore((s) => s.createJunctionTable);

    const [pendingConn, setPendingConn] = useState<Connection | null>(null);
    const [pendingConnectSource, setPendingConnectSource] = useState<
        string | null
    >(null);

    const handleConnect = useCallback((conn: Connection) => {
        setPendingConn(conn);
    }, []);

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

    // Highlight the pending source node so the user knows which table is selected
    const displayNodes = useMemo(
        () =>
            pendingConnectSource
                ? nodes.map((n) =>
                      n.id === pendingConnectSource
                          ? { ...n, selected: true }
                          : n,
                  )
                : nodes,
        [nodes, pendingConnectSource],
    );

    return {
        pendingConn,
        setPendingConn,
        pendingConnectSource,
        setPendingConnectSource,
        handleConnect,
        handleNodeClick,
        handleConfirmRelation,
        displayNodes,
    };
}
