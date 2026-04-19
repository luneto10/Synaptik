import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDiagramStore } from "../../../features/diagram/store/diagramStore";
import {
    _resetClipboardForTests,
    getClipboard,
} from "../../../features/diagram/store/clipboard";
import {
    resetDiagramHistoryGestureDepthForTests,
} from "../../../features/diagram/store/diagramHistory";
import type { DbColumn } from "../../../features/diagram/types/db.types";
import {
    isBoxNode,
    isTableNode,
    type BoxNode,
    type RelationEdge,
    type TableNode,
} from "../../../features/diagram/types/flow.types";
import { PASTE_OFFSET } from "../../../features/diagram/constants";

// ── helpers ──────────────────────────────────────────────────────────────────

const pk = (id: string): DbColumn => ({
    id,
    name: "id",
    type: "uuid",
    isPrimaryKey: true,
    isForeignKey: false,
    isNullable: false,
    isUnique: true,
});

const fk = (
    id: string,
    name: string,
    refTableId: string,
    refColumnId: string,
): DbColumn => ({
    id,
    name,
    type: "uuid",
    isPrimaryKey: false,
    isForeignKey: true,
    isNullable: false,
    isUnique: false,
    references: { tableId: refTableId, columnId: refColumnId },
});

const table = (
    id: string,
    name: string,
    columns: DbColumn[],
    selected = false,
    position = { x: 0, y: 0 },
): TableNode =>
    ({
        id,
        type: "tableNode",
        position,
        selected,
        data: { id, name, columns },
    }) as TableNode;

const box = (
    id: string,
    title: string,
    selected = false,
    position = { x: 0, y: 0 },
    size = { width: 200, height: 150 },
): BoxNode =>
    ({
        id,
        type: "boxNode",
        position,
        zIndex: -1,
        selected,
        width: size.width,
        height: size.height,
        data: { title, color: "#6366f1", opacity: 0.1 },
    }) as BoxNode;

const resetStore = () => {
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
};

beforeEach(() => {
    _resetClipboardForTests();
    resetStore();
});

afterEach(() => {
    _resetClipboardForTests();
});

// ── copySelection ────────────────────────────────────────────────────────────

describe("copySelection", () => {
    it("is a no-op when nothing is selected", () => {
        useDiagramStore.setState({
            nodes: [table("u", "users", [pk("pk-u")])],
            edges: [],
        });

        useDiagramStore.getState().copySelection();

        expect(getClipboard()).toBeNull();
    });

    it("snapshots the selected table and leaves originals untouched", () => {
        useDiagramStore.setState({
            nodes: [table("u", "users", [pk("pk-u")], true)],
            edges: [],
        });

        useDiagramStore.getState().copySelection();

        const payload = getClipboard();
        expect(payload?.nodes).toHaveLength(1);
        expect(payload?.nodes[0].id).toBe("u");
        expect(useDiagramStore.getState().nodes[0].selected).toBe(true);
    });

    it("only captures edges whose BOTH endpoints are selected", () => {
        const edgeAB: RelationEdge = {
            id: "e-ab",
            source: "a",
            target: "b",
            type: "relation",
            data: {
                sourceColumnId: "pk-a",
                targetColumnId: "pk-b",
                relationshipType: "one-to-many",
            },
        };
        const edgeAC: RelationEdge = {
            id: "e-ac",
            source: "a",
            target: "c",
            type: "relation",
            data: {
                sourceColumnId: "pk-a",
                targetColumnId: "pk-c",
                relationshipType: "one-to-many",
            },
        };
        useDiagramStore.setState({
            nodes: [
                table("a", "alpha", [pk("pk-a")], true),
                table("b", "bravo", [pk("pk-b")], true),
                table("c", "charlie", [pk("pk-c")], false),
            ],
            edges: [edgeAB, edgeAC],
        });

        useDiagramStore.getState().copySelection();

        const payload = getClipboard();
        expect(payload?.edges.map((e) => e.id)).toEqual(["e-ab"]);
    });
});

// ── pasteClipboard ───────────────────────────────────────────────────────────

describe("pasteClipboard", () => {
    it("is a no-op when the clipboard is empty", () => {
        useDiagramStore.setState({
            nodes: [table("u", "users", [pk("pk-u")])],
            edges: [],
        });

        useDiagramStore.getState().pasteClipboard();

        expect(useDiagramStore.getState().nodes).toHaveLength(1);
    });

    it("clones a single table with new ids, suffixed name, offset position, and selects it", () => {
        useDiagramStore.setState({
            nodes: [
                table("u", "users", [pk("pk-u")], true, { x: 100, y: 200 }),
            ],
            edges: [],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        const state = useDiagramStore.getState();
        expect(state.nodes).toHaveLength(2);

        const original = state.nodes.find((n) => n.id === "u")!;
        const clone = state.nodes.find((n) => n.id !== "u")!;

        expect(original.selected).toBe(false);
        expect(clone.selected).toBe(true);
        expect(clone.position).toEqual({
            x: 100 + PASTE_OFFSET,
            y: 200 + PASTE_OFFSET,
        });

        expect(isTableNode(clone)).toBe(true);
        if (!isTableNode(clone)) return;
        expect(clone.data.name).toBe("users_copy");
        expect(clone.data.id).toBe(clone.id);
        expect(clone.data.columns[0].id).not.toBe("pk-u");
        expect(clone.data.columns[0].isPrimaryKey).toBe(true);
    });

    it("resolves name collision by appending _copy then _copy_2 on repeat pastes", () => {
        useDiagramStore.setState({
            nodes: [table("u", "users", [pk("pk-u")], true)],
            edges: [],
        });

        const store = useDiagramStore.getState();
        store.copySelection();
        store.pasteClipboard();
        store.pasteClipboard();

        const names = (useDiagramStore.getState().nodes.filter(isTableNode)).map(
            (n) => n.data.name,
        );
        expect(names.sort()).toEqual(["users", "users_copy", "users_copy_2"]);
    });

    it("clones an edge between two copied tables with remapped endpoints, column ids, and handles", () => {
        const edgeAB: RelationEdge = {
            id: "e-ab",
            source: "a",
            target: "b",
            type: "relation",
            sourceHandle: "pk-a-source-right",
            targetHandle: "fk-b-target-left",
            data: {
                sourceColumnId: "pk-a",
                targetColumnId: "fk-b",
                relationshipType: "one-to-many",
                autoCreatedColumnId: "fk-b",
                autoCreatedColumnNodeId: "b",
            },
        };
        useDiagramStore.setState({
            nodes: [
                table("a", "alpha", [pk("pk-a")], true),
                table(
                    "b",
                    "bravo",
                    [pk("pk-b"), fk("fk-b", "alpha_id", "a", "pk-a")],
                    true,
                ),
            ],
            edges: [edgeAB],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        const state = useDiagramStore.getState();
        expect(state.edges).toHaveLength(2);

        const clonedEdge = state.edges.find((e) => e.id !== "e-ab")!;
        const clonedA = state.nodes.find(
            (n) => n.id !== "a" && n.id !== "b" && isTableNode(n) && n.data.name === "alpha_copy",
        ) as TableNode;
        const clonedB = state.nodes.find(
            (n) => n.id !== "a" && n.id !== "b" && isTableNode(n) && n.data.name === "bravo_copy",
        ) as TableNode;

        expect(clonedEdge.source).toBe(clonedA.id);
        expect(clonedEdge.target).toBe(clonedB.id);

        const newPkA = clonedA.data.columns.find((c) => c.isPrimaryKey)!;
        const newFkB = clonedB.data.columns.find((c) => c.isForeignKey)!;
        expect(clonedEdge.data?.sourceColumnId).toBe(newPkA.id);
        expect(clonedEdge.data?.targetColumnId).toBe(newFkB.id);
        expect(clonedEdge.data?.autoCreatedColumnId).toBe(newFkB.id);
        expect(clonedEdge.data?.autoCreatedColumnNodeId).toBe(clonedB.id);

        // Handles rebuilt with new column ids, preserving side.
        expect(clonedEdge.sourceHandle).toBe(`${newPkA.id}-source-right`);
        expect(clonedEdge.targetHandle).toBe(`${newFkB.id}-target-left`);
    });

    it("remaps FK references when the parent table is in the selection", () => {
        useDiagramStore.setState({
            nodes: [
                table("a", "alpha", [pk("pk-a")], true),
                table(
                    "b",
                    "bravo",
                    [pk("pk-b"), fk("fk-b", "alpha_id", "a", "pk-a")],
                    true,
                ),
            ],
            edges: [],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        const clonedA = useDiagramStore
            .getState()
            .nodes.filter(isTableNode)
            .find((n) => n.data.name === "alpha_copy")!;
        const clonedB = useDiagramStore
            .getState()
            .nodes.filter(isTableNode)
            .find((n) => n.data.name === "bravo_copy")!;

        const fkCol = clonedB.data.columns.find((c) => c.isForeignKey)!;
        expect(fkCol.references?.tableId).toBe(clonedA.id);
        expect(fkCol.references?.columnId).toBe(
            clonedA.data.columns.find((c) => c.isPrimaryKey)!.id,
        );
    });

    it("leaves FK references untouched when the parent table is NOT in the selection", () => {
        useDiagramStore.setState({
            nodes: [
                table("a", "alpha", [pk("pk-a")], false),
                table(
                    "b",
                    "bravo",
                    [pk("pk-b"), fk("fk-b", "alpha_id", "a", "pk-a")],
                    true,
                ),
            ],
            edges: [],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        const clonedB = useDiagramStore
            .getState()
            .nodes.filter(isTableNode)
            .find((n) => n.data.name === "bravo_copy")!;

        const fkCol = clonedB.data.columns.find((c) => c.isForeignKey)!;
        expect(fkCol.references?.tableId).toBe("a");
        expect(fkCol.references?.columnId).toBe("pk-a");
    });

    it("drops edges whose junction table is not in the clipboard", () => {
        const danglingJunctionEdge: RelationEdge = {
            id: "e-dangling",
            source: "a",
            target: "b",
            type: "relation",
            sourceHandle: "pk-a-source-right",
            targetHandle: "pk-b-target-left",
            data: {
                sourceColumnId: "pk-a",
                targetColumnId: "pk-b",
                relationshipType: "one-to-many",
                junctionTableId: "j-not-selected",
            },
        };
        useDiagramStore.setState({
            nodes: [
                table("a", "alpha", [pk("pk-a")], true),
                table("b", "bravo", [pk("pk-b")], true),
                table("j-not-selected", "junction", [pk("pk-j")], false),
            ],
            edges: [danglingJunctionEdge],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        // Only the original edge remains; no clone was created.
        expect(useDiagramStore.getState().edges).toHaveLength(1);
        expect(useDiagramStore.getState().edges[0].id).toBe("e-dangling");
    });

    it("clones a category box preserving size/color/opacity and suffixing the title", () => {
        useDiagramStore.setState({
            nodes: [box("b1", "Group A", true, { x: 50, y: 60 }, { width: 300, height: 220 })],
            edges: [],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        const state = useDiagramStore.getState();
        expect(state.nodes).toHaveLength(2);

        const clone = state.nodes.find((n) => n.id !== "b1")!;
        expect(isBoxNode(clone)).toBe(true);
        if (!isBoxNode(clone)) return;
        expect(clone.data.title).toBe("Group A_copy");
        expect(clone.width).toBe(300);
        expect(clone.height).toBe(220);
        expect(clone.data.color).toBe("#6366f1");
        expect(clone.data.opacity).toBe(0.1);
        expect(clone.position).toEqual({
            x: 50 + PASTE_OFFSET,
            y: 60 + PASTE_OFFSET,
        });
        expect(clone.selected).toBe(true);
    });

    it("does not suffix an empty box title", () => {
        useDiagramStore.setState({
            nodes: [box("b1", "", true)],
            edges: [],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        const clone = useDiagramStore.getState().nodes.find((n) => n.id !== "b1")!;
        if (!isBoxNode(clone)) throw new Error("expected box");
        expect(clone.data.title).toBe("");
    });

    it("paste is a single undo step — one undo removes every pasted node and edge", () => {
        const edgeAB: RelationEdge = {
            id: "e-ab",
            source: "a",
            target: "b",
            type: "relation",
            sourceHandle: "pk-a-source-right",
            targetHandle: "pk-b-target-left",
            data: {
                sourceColumnId: "pk-a",
                targetColumnId: "pk-b",
                relationshipType: "one-to-many",
            },
        };
        useDiagramStore.setState({
            nodes: [
                table("a", "alpha", [pk("pk-a")], true),
                table("b", "bravo", [pk("pk-b")], true),
            ],
            edges: [edgeAB],
        });
        useDiagramStore.temporal.getState().clear?.();

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        expect(useDiagramStore.getState().nodes).toHaveLength(4);
        expect(useDiagramStore.getState().edges).toHaveLength(2);

        useDiagramStore.temporal.getState().undo();

        expect(useDiagramStore.getState().nodes).toHaveLength(2);
        expect(useDiagramStore.getState().edges).toHaveLength(1);
    });

    it("centers the bounding box on the cursor when an anchor is passed", () => {
        useDiagramStore.setState({
            nodes: [
                table("a", "alpha", [pk("pk-a")], true, { x: 100, y: 200 }),
                table("b", "bravo", [pk("pk-b")], true, { x: 400, y: 260 }),
            ],
            edges: [],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard({ x: 800, y: 500 });

        const state = useDiagramStore.getState();
        const clonedA = state.nodes
            .filter(isTableNode)
            .find((n) => n.data.name === "alpha_copy")!;
        const clonedB = state.nodes
            .filter(isTableNode)
            .find((n) => n.data.name === "bravo_copy")!;

        // Default 280×200 → bbox (100,200)-(680,460), center (390,330).
        // Anchor (800,500) → offset (410,170).
        expect(clonedA.position).toEqual({ x: 510, y: 370 });
        expect(clonedB.position).toEqual({ x: 810, y: 430 });
    });

    it("falls back to the constant PASTE_OFFSET when no anchor is passed", () => {
        useDiagramStore.setState({
            nodes: [table("a", "alpha", [pk("pk-a")], true, { x: 100, y: 200 })],
            edges: [],
        });

        useDiagramStore.getState().copySelection();
        useDiagramStore.getState().pasteClipboard();

        const clone = useDiagramStore
            .getState()
            .nodes.find((n) => n.id !== "a")!;
        expect(clone.position).toEqual({
            x: 100 + PASTE_OFFSET,
            y: 200 + PASTE_OFFSET,
        });
    });

    it("clipboard survives a subsequent undo of an unrelated action", () => {
        useDiagramStore.setState({
            nodes: [table("a", "alpha", [pk("pk-a")], true)],
            edges: [],
        });

        useDiagramStore.getState().copySelection();
        expect(getClipboard()?.nodes).toHaveLength(1);

        // Unrelated mutation + undo.
        useDiagramStore.getState().addTable("Orders");
        useDiagramStore.temporal.getState().undo();

        expect(getClipboard()?.nodes).toHaveLength(1);
    });
});
