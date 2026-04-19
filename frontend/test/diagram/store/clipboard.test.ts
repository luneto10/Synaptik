import { afterEach, describe, expect, it } from "vitest";
import {
    _resetClipboardForTests,
    getClipboard,
    hasClipboardContent,
    setClipboard,
} from "../../../features/diagram/store/clipboard";
import type {
    DiagramNode,
    RelationEdge,
    TableNode,
} from "../../../features/diagram/types/flow.types";

const table = (id: string, name: string): TableNode =>
    ({
        id,
        type: "tableNode",
        position: { x: 0, y: 0 },
        data: { id, name, columns: [] },
    }) as TableNode;

afterEach(() => {
    _resetClipboardForTests();
});

describe("clipboard module", () => {
    it("returns null when empty and reports no content", () => {
        expect(getClipboard()).toBeNull();
        expect(hasClipboardContent()).toBe(false);
    });

    it("round-trips a payload", () => {
        setClipboard({ nodes: [table("a", "users")], edges: [] });

        expect(hasClipboardContent()).toBe(true);
        const payload = getClipboard();
        expect(payload?.nodes).toHaveLength(1);
        expect(payload?.nodes[0].id).toBe("a");
    });

    it("empty-nodes payload reports no content", () => {
        setClipboard({ nodes: [], edges: [] });
        expect(hasClipboardContent()).toBe(false);
    });

    it("isolates the clipboard from mutations on the set payload", () => {
        const nodes: DiagramNode[] = [table("a", "users")];
        setClipboard({ nodes, edges: [] });

        nodes.push(table("b", "orders"));

        expect(getClipboard()?.nodes).toHaveLength(1);
    });

    it("isolates the clipboard from mutations on the retrieved payload", () => {
        setClipboard({ nodes: [table("a", "users")], edges: [] });

        const retrieved = getClipboard()!;
        retrieved.nodes.push(table("b", "orders"));
        retrieved.edges.push({ id: "e" } as RelationEdge);

        expect(getClipboard()?.nodes).toHaveLength(1);
        expect(getClipboard()?.edges).toHaveLength(0);
    });

    it("reset clears the clipboard", () => {
        setClipboard({ nodes: [table("a", "users")], edges: [] });
        _resetClipboardForTests();
        expect(getClipboard()).toBeNull();
        expect(hasClipboardContent()).toBe(false);
    });
});
