import { beforeEach, describe, expect, it } from "vitest";
import type { Connection } from "@xyflow/react";
import type { DbColumn } from "../../../features/diagram/types/db.types";
import type { TableNode } from "../../../features/diagram/types/flow.types";
import { useDiagramStore } from "../../../features/diagram/store/diagramStore";
import {
    beginDiagramHistoryGesture,
    endDiagramHistoryGestureIfActive,
    resetDiagramHistoryGestureDepthForTests,
} from "../../../features/diagram/store/diagramHistory";

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

const conn = (source: string, target: string): Connection => ({
    source,
    target,
    sourceHandle: null,
    targetHandle: null,
});

describe("diagram store actions integration", () => {
    beforeEach(() => {
        resetDiagramHistoryGestureDepthForTests();
        const history = useDiagramStore.temporal.getState() as {
            clear?: () => void;
            pastStates?: unknown[];
            futureStates?: unknown[];
            resume?: () => void;
            unpause?: () => void;
            setTracking?: (tracking: boolean) => void;
        };
        history.clear?.();
        if (history.pastStates) history.pastStates = [];
        if (history.futureStates) history.futureStates = [];
        history.resume?.();
        history.unpause?.();
        history.setTracking?.(true);
        useDiagramStore.setState({ nodes: [], edges: [] });
    });

    it("does not append temporal history during a paused geometry burst", () => {
        const history = useDiagramStore.temporal.getState();
        history.clear?.();
        useDiagramStore.setState({
            nodes: [node("a", "A", [pk("pk-a")])],
            edges: [],
        });
        history.clear?.();

        beginDiagramHistoryGesture();
        const lenDuring = history.pastStates.length;
        for (let i = 0; i < 15; i++) {
            useDiagramStore.getState().onNodesChange([
                {
                    type: "position",
                    id: "a",
                    position: { x: 10 + i, y: 20 },
                    dragging: true,
                },
            ]);
        }
        expect(history.pastStates.length).toBe(lenDuring);

        endDiagramHistoryGestureIfActive();
        useDiagramStore.getState().onNodesChange([
            {
                type: "position",
                id: "a",
                position: { x: 500, y: 600 },
                dragging: false,
            },
        ]);
        expect(history.pastStates.length).toBeGreaterThanOrEqual(lenDuring);
    });

    it("does not append temporal history during a paused resize burst", () => {
        const history = useDiagramStore.temporal.getState();
        history.clear?.();
        useDiagramStore.setState({
            nodes: [node("a", "A", [pk("pk-a")])],
            edges: [],
        });
        history.clear?.();

        beginDiagramHistoryGesture();
        const lenDuring = history.pastStates.length;
        for (let i = 0; i < 12; i++) {
            useDiagramStore.getState().onNodesChange([
                {
                    type: "dimensions",
                    id: "a",
                    dimensions: { width: 300 + i, height: 200 },
                    resizing: true,
                },
            ]);
        }
        expect(history.pastStates.length).toBe(lenDuring);

        endDiagramHistoryGestureIfActive();
        useDiagramStore.getState().onNodesChange([
            {
                type: "dimensions",
                id: "a",
                dimensions: { width: 420, height: 260 },
                resizing: false,
            },
        ]);
        expect(history.pastStates.length).toBeGreaterThanOrEqual(lenDuring);
    });

    it("undo restores prior width and height after resize commit", () => {
        const history = useDiagramStore.temporal.getState();
        history.clear?.();
        useDiagramStore.setState({
            nodes: [
                {
                    ...node("a", "A", [pk("pk-a")]),
                    measured: { width: 280, height: 200 },
                },
            ],
            edges: [],
        });
        history.clear?.();

        beginDiagramHistoryGesture();
        endDiagramHistoryGestureIfActive();
        useDiagramStore.getState().onNodesChange([
            {
                type: "dimensions",
                id: "a",
                dimensions: { width: 420, height: 260 },
                resizing: false,
            },
        ]);

        let n = useDiagramStore.getState().nodes.find((x) => x.id === "a");
        expect(n?.measured?.width).toBe(420);
        expect(n?.measured?.height).toBe(260);

        history.undo();
        n = useDiagramStore.getState().nodes.find((x) => x.id === "a");
        expect(n?.measured?.width).toBe(280);
        expect(n?.measured?.height).toBe(200);
    });

    it("deleteTablesAtomic on junction then one undo restores node and junction edges", () => {
        const history = useDiagramStore.temporal.getState();
        useDiagramStore.setState({
            nodes: [
                node("users", "Users", [pk("pk-users")]),
                node("roles", "Roles", [pk("pk-roles")]),
            ],
            edges: [],
        });

        useDiagramStore.getState().createJunctionTable("users", "roles");
        const withJunction = useDiagramStore.getState();
        const junction = withJunction.nodes.find(
            (n) => n.id !== "users" && n.id !== "roles",
        );
        expect(junction).toBeTruthy();
        const junctionId = junction!.id;
        expect(
            withJunction.edges.filter((e) => e.data?.junctionTableId === junctionId)
                .length,
        ).toBe(2);

        history.clear?.();
        const pastLen = history.pastStates.length;

        useDiagramStore.getState().deleteTablesAtomic([junctionId]);

        expect(history.pastStates.length).toBeGreaterThanOrEqual(pastLen);
        let state = useDiagramStore.getState();
        expect(state.nodes.some((n) => n.id === junctionId)).toBe(false);

        history.undo();
        state = useDiagramStore.getState();
        expect(state.nodes.some((n) => n.id === junctionId)).toBe(true);
        expect(
            state.edges.filter((e) => e.data?.junctionTableId === junctionId)
                .length,
        ).toBe(2);
    });

    it("addTable then undo removes the table without any move", () => {
        const history = useDiagramStore.temporal.getState();
        history.clear?.();
        expect(useDiagramStore.getState().nodes.length).toBe(0);

        useDiagramStore.getState().addTable("Orders");
        expect(useDiagramStore.getState().nodes.length).toBe(1);

        history.undo();
        expect(useDiagramStore.getState().nodes.length).toBe(0);
    });

    it("temporal undo and redo with empty stacks do not throw", () => {
        const history = useDiagramStore.temporal.getState();
        history.clear?.();
        expect(() => history.undo()).not.toThrow();
        expect(() => history.redo()).not.toThrow();
    });

    it("two sequential move gestures undo in LIFO (only last moved node reverts)", () => {
        const history = useDiagramStore.temporal.getState();
        useDiagramStore.setState({
            nodes: [node("a", "A", [pk("pk-a")]), node("b", "B", [pk("pk-b")])],
            edges: [],
        });
        history.clear?.();

        // Gesture 1: move A (seed snapshot on first change, then pause during gesture)
        useDiagramStore.getState().onNodesChange([
            {
                type: "position",
                id: "a",
                position: { x: 100, y: 0 },
                dragging: true,
            },
        ]);
        beginDiagramHistoryGesture();
        useDiagramStore.getState().onNodesChange([
            {
                type: "position",
                id: "a",
                position: { x: 200, y: 0 },
                dragging: true,
            },
        ]);
        endDiagramHistoryGestureIfActive();

        // Gesture 2: move B
        useDiagramStore.getState().onNodesChange([
            {
                type: "position",
                id: "b",
                position: { x: 0, y: 150 },
                dragging: true,
            },
        ]);
        beginDiagramHistoryGesture();
        useDiagramStore.getState().onNodesChange([
            {
                type: "position",
                id: "b",
                position: { x: 0, y: 250 },
                dragging: true,
            },
        ]);
        endDiagramHistoryGestureIfActive();

        let a = useDiagramStore.getState().nodes.find((n) => n.id === "a");
        let b = useDiagramStore.getState().nodes.find((n) => n.id === "b");
        expect(a?.position).toEqual({ x: 200, y: 0 });
        expect(b?.position).toEqual({ x: 0, y: 250 });

        history.undo();
        a = useDiagramStore.getState().nodes.find((n) => n.id === "a");
        b = useDiagramStore.getState().nodes.find((n) => n.id === "b");
        expect(a?.position).toEqual({ x: 200, y: 0 });
        expect(b?.position).toEqual({ x: 0, y: 0 });

        history.undo();
        a = useDiagramStore.getState().nodes.find((n) => n.id === "a");
        b = useDiagramStore.getState().nodes.find((n) => n.id === "b");
        expect(a?.position).toEqual({ x: 0, y: 0 });
        expect(b?.position).toEqual({ x: 0, y: 0 });
    });

    it("two sequential resize gestures undo in LIFO (only last resized node reverts)", () => {
        const history = useDiagramStore.temporal.getState();
        useDiagramStore.setState({
            nodes: [
                {
                    ...node("a", "A", [pk("pk-a")]),
                    measured: { width: 280, height: 200 },
                },
                {
                    ...node("b", "B", [pk("pk-b")]),
                    measured: { width: 300, height: 220 },
                },
            ],
            edges: [],
        });
        history.clear?.();

        // Gesture 1: resize A
        useDiagramStore.getState().onNodesChange([
            {
                type: "dimensions",
                id: "a",
                dimensions: { width: 400, height: 260 },
                resizing: true,
            },
        ]);
        beginDiagramHistoryGesture();
        useDiagramStore.getState().onNodesChange([
            {
                type: "dimensions",
                id: "a",
                dimensions: { width: 420, height: 280 },
                resizing: true,
            },
        ]);
        endDiagramHistoryGestureIfActive();

        // Gesture 2: resize B
        useDiagramStore.getState().onNodesChange([
            {
                type: "dimensions",
                id: "b",
                dimensions: { width: 520, height: 340 },
                resizing: true,
            },
        ]);
        beginDiagramHistoryGesture();
        useDiagramStore.getState().onNodesChange([
            {
                type: "dimensions",
                id: "b",
                dimensions: { width: 560, height: 360 },
                resizing: true,
            },
        ]);
        endDiagramHistoryGestureIfActive();

        let a = useDiagramStore.getState().nodes.find((n) => n.id === "a");
        let b = useDiagramStore.getState().nodes.find((n) => n.id === "b");
        expect(a?.measured?.width).toBe(420);
        expect(a?.measured?.height).toBe(280);
        expect(b?.measured?.width).toBe(560);
        expect(b?.measured?.height).toBe(360);

        history.undo();
        a = useDiagramStore.getState().nodes.find((n) => n.id === "a");
        b = useDiagramStore.getState().nodes.find((n) => n.id === "b");
        expect(a?.measured?.width).toBe(420);
        expect(a?.measured?.height).toBe(280);
        expect(b?.measured?.width).toBe(300);
        expect(b?.measured?.height).toBe(220);

        history.undo();
        a = useDiagramStore.getState().nodes.find((n) => n.id === "a");
        b = useDiagramStore.getState().nodes.find((n) => n.id === "b");
        expect(a?.measured?.width).toBe(280);
        expect(a?.measured?.height).toBe(200);
        expect(b?.measured?.width).toBe(300);
        expect(b?.measured?.height).toBe(220);
    });

    it("addEdgeWithType creates FK column, and deleteEdge removes it", () => {
        useDiagramStore.setState({
            nodes: [
                node("users", "Users", [pk("pk-users")]),
                node("orders", "Orders", [pk("pk-orders")]),
            ],
            edges: [],
        });

        useDiagramStore
            .getState()
            .addEdgeWithType(conn("users", "orders"), "user_id", "one-to-many");

        const afterCreate = useDiagramStore.getState();
        expect(afterCreate.edges.length).toBe(1);
        expect(
            afterCreate.nodes
                .find((n) => n.id === "orders")
                ?.data.columns.some((c) => c.name === "user_id"),
        ).toBe(true);

        const edgeId = afterCreate.edges[0]?.id;
        expect(edgeId).toBeTruthy();
        useDiagramStore.getState().deleteEdge(edgeId!);

        const afterDelete = useDiagramStore.getState();
        expect(afterDelete.edges.length).toBe(0);
        expect(
            afterDelete.nodes
                .find((n) => n.id === "orders")
                ?.data.columns.some((c) => c.name === "user_id"),
        ).toBe(false);
    });

    it("createJunctionTable then deleting one junction edge cascades to direct M:N", () => {
        useDiagramStore.setState({
            nodes: [
                node("users", "Users", [pk("pk-users")]),
                node("roles", "Roles", [pk("pk-roles")]),
            ],
            edges: [],
        });

        useDiagramStore.getState().createJunctionTable("users", "roles");
        const withJunction = useDiagramStore.getState();

        const junction = withJunction.nodes.find(
            (n) => n.id !== "users" && n.id !== "roles",
        );
        expect(junction).toBeTruthy();
        const junctionEdges = withJunction.edges.filter(
            (e) => e.data?.junctionTableId === junction?.id,
        );
        expect(junctionEdges.length).toBe(2);

        useDiagramStore.getState().deleteEdge(junctionEdges[0]!.id);

        const finalState = useDiagramStore.getState();
        expect(
            finalState.nodes.find((n) => n.id === junction?.id),
        ).toBeUndefined();
        const mnEdge = finalState.edges.find(
            (e) => e.data?.relationshipType === "many-to-many",
        );
        expect(mnEdge).toBeTruthy();
        expect(mnEdge?.source).toBe("users");
        expect(mnEdge?.target).toBe("roles");
    });

    it("retargetFkColumn rewires edge source and updates FK metadata", () => {
        const fkCol: DbColumn = {
            id: "fk-user-id",
            name: "user_id",
            type: "uuid",
            isPrimaryKey: false,
            isForeignKey: true,
            isNullable: false,
            isUnique: false,
            references: { tableId: "users", columnId: "pk-users" },
        };

        useDiagramStore.setState({
            nodes: [
                node("users", "Users", [pk("pk-users")]),
                node("products", "Products", [pk("pk-products")]),
                node("orders", "Orders", [pk("pk-orders"), fkCol]),
            ],
            edges: [
                {
                    id: "edge-users-orders",
                    source: "users",
                    target: "orders",
                    type: "relation",
                    sourceHandle: "pk-users-source",
                    targetHandle: "fk-user-id-target",
                    data: {
                        sourceColumnId: "pk-users",
                        targetColumnId: "fk-user-id",
                        relationshipType: "one-to-many",
                        autoCreatedColumnId: "fk-user-id",
                        autoCreatedColumnNodeId: "orders",
                    },
                },
            ],
        });

        useDiagramStore
            .getState()
            .retargetFkColumn("orders", "fk-user-id", "products");
        const state = useDiagramStore.getState();

        const updatedFk = state.nodes
            .find((n) => n.id === "orders")
            ?.data.columns.find((c) => c.id === "fk-user-id");

        expect(updatedFk?.name).toBe("product_id");
        expect(updatedFk?.references?.tableId).toBe("products");

        const edge = state.edges.find((e) => e.target === "orders");
        expect(edge?.source).toBe("products");
        expect(edge?.data?.sourceColumnId).toBe("pk-products");
    });

    it("node actions mutate columns and table metadata", () => {
        useDiagramStore.setState({
            nodes: [node("users", "Users", [pk("pk-users")])],
            edges: [],
        });

        useDiagramStore.getState().addColumn("users", "col-a");
        let users = useDiagramStore
            .getState()
            .nodes.find((n) => n.id === "users");
        expect(users?.data.columns.some((c) => c.id === "col-a")).toBe(true);

        useDiagramStore.getState().updateColumn("users", {
            id: "col-a",
            name: "email",
            type: "text",
            isPrimaryKey: false,
            isForeignKey: false,
            isNullable: false,
            isUnique: true,
        });
        users = useDiagramStore.getState().nodes.find((n) => n.id === "users");
        expect(users?.data.columns.find((c) => c.id === "col-a")?.name).toBe(
            "email",
        );

        useDiagramStore.getState().renameTable("users", "AppUsers");
        users = useDiagramStore.getState().nodes.find((n) => n.id === "users");
        expect(users?.data.name).toBe("AppUsers");

        useDiagramStore.getState().removeColumn("users", "col-a");
        users = useDiagramStore.getState().nodes.find((n) => n.id === "users");
        expect(users?.data.columns.some((c) => c.id === "col-a")).toBe(false);
    });

    it("flipEdgeEnd and flipColumnHandleSide swap handle sides", () => {
        useDiagramStore.setState({
            nodes: [
                node("users", "Users", [pk("pk-users")]),
                node("orders", "Orders", [pk("pk-orders")]),
            ],
            edges: [
                {
                    id: "edge-users-orders",
                    source: "users",
                    target: "orders",
                    type: "relation",
                    sourceHandle: "pk-users-source",
                    targetHandle: "pk-orders-target",
                    data: {
                        sourceColumnId: "pk-users",
                        targetColumnId: "pk-orders",
                        relationshipType: "one-to-many",
                    },
                },
            ],
        });

        useDiagramStore.getState().flipEdgeEnd("edge-users-orders", "source");
        let edge = useDiagramStore
            .getState()
            .edges.find((e) => e.id === "edge-users-orders");
        expect(edge?.sourceHandle).toBe("pk-users-source-left");

        useDiagramStore.getState().flipEdgeEnd("edge-users-orders", "target");
        edge = useDiagramStore
            .getState()
            .edges.find((e) => e.id === "edge-users-orders");
        expect(edge?.targetHandle).toBe("pk-orders-target-right");

        useDiagramStore.getState().flipColumnHandleSide("users", "pk-users");
        edge = useDiagramStore
            .getState()
            .edges.find((e) => e.id === "edge-users-orders");
        expect(edge?.sourceHandle).toBe("pk-users-source");
    });

    it("loadDiagram, addTable, and deleteTable work together", () => {
        const loadedNodes = [node("users", "Users", [pk("pk-users")])];
        const loadedEdges: never[] = [];
        useDiagramStore.getState().loadDiagram(loadedNodes, loadedEdges);
        expect(useDiagramStore.getState().nodes.length).toBe(1);

        useDiagramStore.getState().addTable("Invoices");
        expect(useDiagramStore.getState().nodes.length).toBe(2);

        useDiagramStore.getState().deleteTable("users");
        expect(
            useDiagramStore.getState().nodes.some((n) => n.id === "users"),
        ).toBe(false);
    });

    it("inserts FK columns below key block", () => {
        const firstFk: DbColumn = {
            id: "fk-a",
            name: "account_id",
            type: "uuid",
            isPrimaryKey: false,
            isForeignKey: true,
            isNullable: false,
            isUnique: false,
            references: { tableId: "accounts", columnId: "pk-accounts" },
        };
        useDiagramStore.setState({
            nodes: [
                node("users", "Users", [pk("pk-users")]),
                node("orders", "Orders", [
                    pk("pk-orders"),
                    firstFk,
                    {
                        id: "col-note",
                        name: "note",
                        type: "text",
                        isPrimaryKey: false,
                        isForeignKey: false,
                        isNullable: true,
                        isUnique: false,
                    },
                ]),
            ],
            edges: [],
        });

        useDiagramStore
            .getState()
            .addEdgeWithType(conn("users", "orders"), "user_id", "one-to-many");

        const orders = useDiagramStore
            .getState()
            .nodes.find((n) => n.id === "orders");
        const names = orders?.data.columns.map((c) => c.name) ?? [];
        expect(names).toEqual(["id", "account_id", "user_id", "note"]);
    });

    it("undo/redo restores load example and table creation", () => {
        const history = useDiagramStore.temporal.getState();

        useDiagramStore.getState().addTable("Users");
        expect(useDiagramStore.getState().nodes.length).toBe(1);
        const createdTableId = useDiagramStore.getState().nodes[0]?.id;
        history.undo();
        expect(useDiagramStore.getState().nodes.length).toBe(0);
        history.redo();
        expect(useDiagramStore.getState().nodes.length).toBe(1);

        useDiagramStore.getState().loadDiagram(
            [node("orders", "Orders", [pk("pk-orders")])],
            [],
        );
        expect(useDiagramStore.getState().nodes.length).toBe(1);
        expect(useDiagramStore.getState().nodes[0]?.id).toBe("orders");
        history.undo();
        expect(useDiagramStore.getState().nodes[0]?.id).toBe(createdTableId);
        expect(useDiagramStore.getState().nodes[0]?.data.name).toBe("Users");
        history.redo();
        expect(useDiagramStore.getState().nodes[0]?.id).toBe("orders");
    });
});
