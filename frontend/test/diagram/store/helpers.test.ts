import { describe, expect, it, vi } from "vitest";
import type { TableNode, RelationEdge } from "../../../features/diagram/types/flow.types";
import type { DbColumn } from "../../../features/diagram/types/db.types";
import {
    cascadeJunction,
    defaultFkColumnName,
    makeFkCol,
    makeMnEdge,
    patchColumns,
    patchNode,
    stripAutoCol,
} from "../../../features/diagram/store/helpers";

const basePk: DbColumn = {
    id: "pk-1",
    name: "id",
    type: "uuid",
    isPrimaryKey: true,
    isForeignKey: false,
    isNullable: false,
    isUnique: true,
};

const makeNode = (id: string, name: string, columns: DbColumn[]): TableNode =>
    ({
        id,
        type: "tableNode",
        position: { x: 0, y: 0 },
        data: { id, name, columns },
    }) as TableNode;

describe("helpers", () => {
    it("defaultFkColumnName lowercases and appends _id", () => {
        expect(defaultFkColumnName("Users")).toBe("users_id");
    });

    it("patchNode updates only the matching node", () => {
        const nodes = [makeNode("n1", "users", [basePk]), makeNode("n2", "orders", [basePk])];
        const patched = patchNode(nodes, "n1", { name: "accounts" });
        expect(patched[0].data.name).toBe("accounts");
        expect(patched[1].data.name).toBe("orders");
    });

    it("patchColumns updates columns on only the target node", () => {
        const nodes = [makeNode("n1", "users", [basePk]), makeNode("n2", "orders", [basePk])];
        const patched = patchColumns(nodes, "n2", (cols) => [...cols, { ...basePk, id: "c2", name: "tenant_id" }]);
        expect(patched[0].data.columns).toHaveLength(1);
        expect(patched[1].data.columns).toHaveLength(2);
    });

    it("stripAutoCol removes generated FK by id", () => {
        const fk: DbColumn = makeFkCol("fk-1", "user_id", "users", "pk-1");
        const nodes = [makeNode("target", "orders", [basePk, fk])];
        const stripped = stripAutoCol(nodes, "fk-1", "target");
        expect(stripped[0].data.columns.find((c) => c.id === "fk-1")).toBeUndefined();
    });

    it("makeMnEdge builds an M:N edge between source tables", () => {
        const random = vi.spyOn(crypto, "randomUUID").mockReturnValue("edge-generated");
        const t1 = makeNode("t1", "users", [{ ...basePk, id: "pk-users" }]);
        const t2 = makeNode("t2", "roles", [{ ...basePk, id: "pk-roles" }]);
        const junctionEdges: RelationEdge[] = [
            {
                id: "j1",
                source: "t1",
                target: "j",
                type: "relation",
                sourceHandle: "pk-users-source",
                targetHandle: "fk-users-target",
                data: { sourceColumnId: "pk-users", targetColumnId: "fk-users", relationshipType: "one-to-many", junctionTableId: "j" },
            },
            {
                id: "j2",
                source: "t2",
                target: "j",
                type: "relation",
                sourceHandle: "pk-roles-source-left",
                targetHandle: "fk-roles-target-right",
                data: { sourceColumnId: "pk-roles", targetColumnId: "fk-roles", relationshipType: "one-to-many", junctionTableId: "j" },
            },
        ];

        const mn = makeMnEdge([t1, t2], junctionEdges);
        expect(mn?.id).toBe("edge-generated");
        expect(mn?.data?.relationshipType).toBe("many-to-many");
        expect(mn?.source).toBe("t1");
        expect(mn?.target).toBe("t2");
        random.mockRestore();
    });

    it("cascadeJunction removes junction node and queues linked edges", () => {
        const random = vi.spyOn(crypto, "randomUUID").mockReturnValue("edge-generated");
        const t1 = makeNode("t1", "users", [{ ...basePk, id: "pk-users" }]);
        const t2 = makeNode("t2", "roles", [{ ...basePk, id: "pk-roles" }]);
        const j = makeNode("j", "users_roles", [{ ...basePk, id: "pk-j" }]);
        const edges: RelationEdge[] = [
            {
                id: "e1",
                source: "t1",
                target: "j",
                type: "relation",
                sourceHandle: "pk-users-source",
                targetHandle: "fk-users-target",
                data: { sourceColumnId: "pk-users", targetColumnId: "fk-users", relationshipType: "one-to-many", junctionTableId: "j", autoCreatedColumnId: "fk-j-1", autoCreatedColumnNodeId: "j" },
            },
            {
                id: "e2",
                source: "t2",
                target: "j",
                type: "relation",
                sourceHandle: "pk-roles-source-left",
                targetHandle: "fk-roles-target-right",
                data: { sourceColumnId: "pk-roles", targetColumnId: "fk-roles", relationshipType: "one-to-many", junctionTableId: "j", autoCreatedColumnId: "fk-j-2", autoCreatedColumnNodeId: "j" },
            },
        ];

        const result = cascadeJunction([t1, t2, j], edges, "j", new Set(["e1"]));
        expect(result.nodes.find((n) => n.id === "j")).toBeUndefined();
        expect(result.extraRemovals).toContain("e2");
        expect(result.newEdge?.data?.relationshipType).toBe("many-to-many");
        random.mockRestore();
    });
});
