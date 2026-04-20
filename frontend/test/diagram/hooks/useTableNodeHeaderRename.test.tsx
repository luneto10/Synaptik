// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTableNodeHeaderRename } from "../../../features/diagram/hooks/useTableNodeHeaderRename";
import { useDiagramStore } from "../../../features/diagram/store/diagramStore";
import type { TableNode } from "../../../features/diagram/types/flow.types";
import {
    TABLE_NODE_TYPE,
    isTableNode,
} from "../../../features/diagram/types/flow.types";
import type { DbColumn } from "../../../features/diagram/types/db.types";

const pk: DbColumn = {
    id: "c1",
    name: "id",
    type: "uuid",
    isPrimaryKey: true,
    isForeignKey: false,
    isNullable: false,
    isUnique: true,
};

function makeTable(id: string, name: string): TableNode {
    return {
        id,
        type: TABLE_NODE_TYPE,
        position: { x: 0, y: 0 },
        data: {
            id,
            name,
            columns: [pk],
            isJunction: false,
        },
        selected: false,
    } as TableNode;
}

describe("useTableNodeHeaderRename", () => {
    beforeEach(() => {
        useDiagramStore.setState({ nodes: [], edges: [] });
    });

    it("openRename seeds draft from the latest table name", () => {
        const { result, rerender } = renderHook(
            ({ name }: { name: string }) =>
                useTableNodeHeaderRename("t1", name),
            { initialProps: { name: "orders" } },
        );

        expect(result.current.draft).toBe("orders");

        rerender({ name: "order_items" });
        expect(result.current.draft).toBe("orders");

        act(() => result.current.openRename());
        expect(result.current.draft).toBe("order_items");
    });

    it("blocks commit and surfaces error when name duplicates another table", () => {
        useDiagramStore.setState({
            nodes: [makeTable("t1", "orders"), makeTable("t2", "customers")],
            edges: [],
        });

        const { result } = renderHook(() =>
            useTableNodeHeaderRename("t1", "orders"),
        );

        act(() => result.current.openRename());
        act(() => result.current.handleDraftChange("customers"));
        act(() => result.current.commitOnBlur());

        expect(findTableName("t1")).toBe("orders");
        expect(result.current.error).toMatch(/already exists/i);
    });
});

function findTableName(nodeId: string): string | undefined {
    const n = useDiagramStore.getState().nodes.find((x) => x.id === nodeId);
    return n && isTableNode(n) ? n.data.name : undefined;
}
