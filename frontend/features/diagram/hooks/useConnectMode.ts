import { useState, useCallback, useMemo, useRef } from "react";
import type {
    Connection,
    NodeMouseHandler,
    OnConnectStartParams,
} from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import type { RelationshipType } from "../types/flow.types";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

const makePendingConn = (source: string, target: string): Connection => ({
    source,
    target,
    sourceHandle: null,
    targetHandle: null,
});

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

    const handleConnect = useCallback((conn: Connection) => {
        didConnect.current = true;
        setPendingConn(conn);
    }, []);

    const handleConnectStart = useCallback(
        (_: MouseEvent | TouchEvent, { nodeId }: OnConnectStartParams) => {
            draggingFromNodeId.current = nodeId;
            didConnect.current = false;
        },
        [],
    );

    const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
        const sourceId = draggingFromNodeId.current;
        draggingFromNodeId.current = null;

        if (didConnect.current) {
            didConnect.current = false;
            return;
        }
        if (!sourceId) return;

        const el = event.target;
        if (!(el instanceof Element)) return;
        const nodeEl = el.closest(".react-flow__node");
        const targetId = nodeEl?.getAttribute("data-id");

        if (targetId && targetId !== sourceId) {
            setPendingConn(makePendingConn(sourceId, targetId));
        }
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
            setPendingConn(makePendingConn(pendingConnectSource, node.id));
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

    /**
     * Enhances nodes with transient selection state for the connect source.
     * This avoids permanently modifying the store for temporary UI highlights.
     */
    const displayNodes = useMemo(() => {
        if (!pendingConnectSource) return nodes;

        return nodes.map((n) =>
            n.id === pendingConnectSource && !n.selected
                ? { ...n, selected: true }
                : n
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
