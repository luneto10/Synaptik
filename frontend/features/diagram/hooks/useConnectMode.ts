import { useState, useCallback, useRef } from "react";
import type {
    Connection,
    NodeMouseHandler,
    OnConnectStartParams,
} from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import { replaceSelection } from "../store/nodeSelection";
import type { RelationshipType } from "../types/flow.types";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

const makePendingConn = (source: string, target: string): Connection => ({
    source,
    target,
    sourceHandle: null,
    targetHandle: null,
});

/** Reads the React Flow node id from a raw mouse event's target element. */
function nodeIdFromEvent(event: MouseEvent | TouchEvent): string | null {
    const el = event.target;
    if (!(el instanceof Element)) return null;
    return el.closest(".react-flow__node")?.getAttribute("data-id") ?? null;
}

export function useConnectMode(activeTool: DiagramTool) {
    const displayNodes = useDiagramStore((s) => s.nodes);

    const [pendingConn, setPendingConn] = useState<Connection | null>(null);
    const [pendingConnectSource, setPendingConnectSource] = useState<
        string | null
    >(null);

    const draggingFromNodeId = useRef<string | null>(null);
    const didConnect = useRef(false);

    /**
     * Single entry point for all three connection paths (handle-drop, node-drop,
     * click-click). Opens the ConnectionDialog and highlights both endpoints.
     */
    const openPendingConnection = useCallback((conn: Connection) => {
        if (!conn.source || !conn.target) return;
        setPendingConn(conn);
        replaceSelection([conn.source, conn.target]);
    }, []);

    // Drag ended on a valid handle — React Flow built the Connection for us.
    const handleConnect = useCallback(
        (conn: Connection) => {
            didConnect.current = true;
            openPendingConnection(conn);
        },
        [openPendingConnection],
    );

    const handleConnectStart = useCallback(
        (_: MouseEvent | TouchEvent, { nodeId }: OnConnectStartParams) => {
            draggingFromNodeId.current = nodeId;
            didConnect.current = false;
        },
        [],
    );

    // Drag ended somewhere else. If it landed on a node (not a handle), treat as connect.
    const handleConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent) => {
            const sourceId = draggingFromNodeId.current;
            draggingFromNodeId.current = null;

            if (didConnect.current) {
                didConnect.current = false;
                return;
            }
            if (!sourceId) return;

            const targetId = nodeIdFromEvent(event);
            if (!targetId || targetId === sourceId) return;

            openPendingConnection(makePendingConn(sourceId, targetId));
        },
        [openPendingConnection],
    );

    const handleNodeClick = useCallback<NodeMouseHandler>(
        (_, node) => {
            if (activeTool !== "connect") return;

            // First click: remember source. Clicking the same node again cancels.
            if (!pendingConnectSource) {
                replaceSelection([node.id]);
                setPendingConnectSource(node.id);
                return;
            }
            if (pendingConnectSource === node.id) {
                setPendingConnectSource(null);
                return;
            }

            openPendingConnection(makePendingConn(pendingConnectSource, node.id));
            setPendingConnectSource(null);
        },
        [activeTool, pendingConnectSource, openPendingConnection],
    );

    const handleConfirmRelation = useCallback(
        (type: RelationshipType, fkName: string, doCreateJunction: boolean) => {
            if (!pendingConn?.source || !pendingConn?.target) return;
            const { createJunctionTable, addEdgeWithType } = useDiagramStore.getState();
            if (doCreateJunction) {
                createJunctionTable(pendingConn.source, pendingConn.target);
            } else {
                addEdgeWithType(pendingConn, fkName, type);
            }
            setPendingConn(null);
        },
        [pendingConn],
    );

    return {
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
    };
}
