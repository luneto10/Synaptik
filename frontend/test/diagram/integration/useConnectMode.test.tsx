// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { DbColumn } from "../../../features/diagram/types/db.types";
import type { TableNode } from "../../../features/diagram/types/flow.types";
import { useDiagramStore } from "../../../features/diagram/store/diagramStore";
import { useConnectMode } from "../../../features/diagram/hooks/useConnectMode";

const pk = (id: string): DbColumn => ({
    id,
    name: "id",
    type: "uuid",
    isPrimaryKey: true,
    isForeignKey: false,
    isNullable: false,
    isUnique: true,
});

const node = (id: string, name: string, columns: DbColumn[]): TableNode =>
    ({
        id,
        type: "tableNode",
        position: { x: 0, y: 0 },
        data: { id, name, columns },
    }) as TableNode;

describe("useConnectMode integration", () => {
    beforeEach(() => {
        useDiagramStore.setState({
            nodes: [
                node("users", "Users", [pk("pk-users")]),
                node("orders", "Orders", [pk("pk-orders")]),
            ],
            edges: [],
        });
    });

    it("supports two-click connect flow in connect mode", () => {
        const { result } = renderHook(() => useConnectMode("connect"));

        act(() => result.current.handleNodeClick({} as never, { id: "users" } as never));
        expect(result.current.pendingConnectSource).toBe("users");

        act(() => result.current.handleNodeClick({} as never, { id: "orders" } as never));
        expect(result.current.pendingConnectSource).toBeNull();
        expect(result.current.pendingConn?.source).toBe("users");
        expect(result.current.pendingConn?.target).toBe("orders");
    });

    it("opens pending connection when drag ends on node body", () => {
        const { result } = renderHook(() => useConnectMode("connect"));

        const targetNode = document.createElement("div");
        targetNode.className = "react-flow__node";
        targetNode.setAttribute("data-id", "orders");
        const inner = document.createElement("span");
        targetNode.appendChild(inner);
        document.body.appendChild(targetNode);

        act(() =>
            result.current.handleConnectStart(
                {} as MouseEvent,
                {
                    nodeId: "users",
                    handleId: null,
                    handleType: "source",
                } as never,
            ),
        );
        act(() => result.current.handleConnectEnd({ target: inner } as unknown as MouseEvent));

        expect(result.current.pendingConn?.source).toBe("users");
        expect(result.current.pendingConn?.target).toBe("orders");
    });

    it("confirmRelation creates edge + FK for 1:N", () => {
        const { result } = renderHook(() => useConnectMode("connect"));

        act(() => {
            result.current.setPendingConn({
                source: "users",
                target: "orders",
                sourceHandle: null,
                targetHandle: null,
            });
        });

        act(() => result.current.handleConfirmRelation("one-to-many", "user_id", false));

        const state = useDiagramStore.getState();
        expect(state.edges.length).toBe(1);
        expect(state.nodes.find((n) => n.id === "orders")?.data.columns.some((c) => c.name === "user_id")).toBe(true);
        expect(result.current.pendingConn).toBeNull();
    });

    it("confirmRelation creates junction table when requested", () => {
        const { result } = renderHook(() => useConnectMode("connect"));

        act(() => {
            result.current.setPendingConn({
                source: "users",
                target: "orders",
                sourceHandle: null,
                targetHandle: null,
            });
        });

        act(() => result.current.handleConfirmRelation("many-to-many", "ignored", true));

        const state = useDiagramStore.getState();
        const junction = state.nodes.find((n) => n.id !== "users" && n.id !== "orders");
        expect(junction).toBeTruthy();
        expect(state.edges.filter((e) => e.data?.junctionTableId === junction?.id).length).toBe(2);
        expect(result.current.pendingConn).toBeNull();
    });
});
