import { useState, useCallback, useMemo, useRef } from "react";
import type {
    Connection,
    NodeChange,
    NodeMouseHandler,
    OnConnectStartParams,
} from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import { withoutHistory } from "../store/diagramHistory";
import type { RelationshipType } from "../types/flow.types";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

const makePendingConn = (source: string, target: string): Connection => ({
    source,
    target,
    sourceHandle: null,
    targetHandle: null,
});

/** Replaces the current node selection with exactly the given ids. No history entry. */
function replaceSelection(ids: string[]) {
    withoutHistory(() => {
        const { nodes, onNodesChange } = useDiagramStore.getState();
        const keep = new Set(ids);
        const changes: NodeChange[] = nodes.map((n) => ({
            type: "select",
            id: n.id,
            selected: keep.has(n.id),
        }));
        onNodesChange(changes);
    });
}

/** Reads the React Flow node id from a raw mouse event's target element. */
function nodeIdFromEvent(event: MouseEvent | TouchEvent): string | null {
    const el = event.target;
    if (!(el instanceof Element)) return null;
    return el.closest(".react-flow__node")?.getAttribute("data-id") ?? null;
}

export function useConnectMode(activeTool: DiagramTool) {
    const nodes = useDiagramStore((s) => s.nodes);
    const addEdgeWithType = useDiagramStore((s) => s.addEdgeWithType);
    const createJunctionTable = useDiagramStore((s) => s.createJunctionTable);

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
            if (doCreateJunction) {
                createJunctionTable(pendingConn.source, pendingConn.target);
            } else {
                addEdgeWithType(pendingConn, fkName, type);
            }
            setPendingConn(null);
        },
        [pendingConn, addEdgeWithType, createJunctionTable],
    );

    /** Visual-only highlight for the first picked node in click-to-connect mode. */
    const displayNodes = useMemo(() => {
        if (!pendingConnectSource) return nodes;
        return nodes.map((n) =>
            n.id === pendingConnectSource && !n.selected
                ? { ...n, selected: true }
                : n,
        );
    }, [nodes, pendingConnectSource]);

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
