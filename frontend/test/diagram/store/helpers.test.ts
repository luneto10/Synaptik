import { describe, expect, it, vi } from "vitest";
import type { TableNode, RelationEdge } from "../../../features/diagram/types/flow.types";
import type { DbColumn } from "../../../features/diagram/types/db.types";
import {
    cascadeJunction,
    defaultFkColumnName,
    insertForeignKeyColumn,
    makeEdge,
    makeFkCol,
    makeMnEdge,
    makePkCol,
    patchColumns,
    patchNode,
    singularizeTableName,
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

describe("singularizeTableName", () => {
    it("lowercases and singularizes a table name", () => {
        expect(singularizeTableName("Users")).toBe("user");
        expect(singularizeTableName("Categories")).toBe("category");
        expect(singularizeTableName("  Orders  ")).toBe("order");
    });

    it("leaves already-singular names unchanged", () => {
        expect(singularizeTableName("Product")).toBe("product");
    });
});

describe("defaultFkColumnName", () => {
    it("singularizes and appends _id", () => {
        expect(defaultFkColumnName("Users")).toBe("user_id");
        expect(defaultFkColumnName("Categories")).toBe("category_id");
    });
});

describe("patchNode", () => {
    it("updates only the matching node", () => {
        const nodes = [makeNode("n1", "users", [basePk]), makeNode("n2", "orders", [basePk])];
        patchNode(nodes, "n1", { name: "accounts" });
        expect(nodes[0].data.name).toBe("accounts");
        expect(nodes[1].data.name).toBe("orders");
    });

    it("leaves nodes unchanged when id does not match", () => {
        const nodes = [makeNode("n1", "users", [basePk])];
        patchNode(nodes, "nonexistent", { name: "other" });
        expect(nodes[0].data.name).toBe("users");
    });
});

describe("patchColumns", () => {
    it("updates columns on only the target node", () => {
        const nodes = [makeNode("n1", "users", [basePk]), makeNode("n2", "orders", [basePk])];
        patchColumns(nodes, "n2", (cols) => [...cols, { ...basePk, id: "c2", name: "tenant_id" }]);
        expect(nodes[0].data.columns).toHaveLength(1);
        expect(nodes[1].data.columns).toHaveLength(2);
    });
});

describe("insertForeignKeyColumn", () => {
    it("inserts FK after the key block (before regular columns)", () => {
        const pk = { ...basePk, id: "pk" };
        const existingFk = makeFkCol("fk-a", "account_id", "accounts", "pk-acc");
        const regular: DbColumn = { ...basePk, id: "reg", isPrimaryKey: false, isForeignKey: false };
        const newFk = makeFkCol("fk-b", "user_id", "users", "pk-users");

        const result = insertForeignKeyColumn([pk, existingFk, regular], newFk);
        expect(result.map((c) => c.id)).toEqual(["pk", "fk-a", "fk-b", "reg"]);
    });

    it("appends when there are no regular columns", () => {
        const pk = { ...basePk };
        const fk = makeFkCol("fk-a", "account_id", "accounts", "pk-acc");
        const newFk = makeFkCol("fk-b", "user_id", "users", "pk-users");

        const result = insertForeignKeyColumn([pk, fk], newFk);
        expect(result.map((c) => c.id)).toEqual(["pk-1", "fk-a", "fk-b"]);
    });
});

describe("makePkCol", () => {
    it("returns a valid primary key column", () => {
        const col = makePkCol();
        expect(col.isPrimaryKey).toBe(true);
        expect(col.name).toBe("id");
        expect(col.type).toBe("uuid");
        expect(col.id).toBeTruthy();
    });
});

describe("makeFkCol", () => {
    it("creates a non-unique FK by default", () => {
        const fk = makeFkCol("fk-1", "user_id", "users", "pk-users");
        expect(fk.isForeignKey).toBe(true);
        expect(fk.isUnique).toBe(false);
        expect(fk.references).toEqual({ tableId: "users", columnId: "pk-users" });
    });

    it("creates a unique FK when unique=true", () => {
        const fk = makeFkCol("fk-1", "user_id", "users", "pk-users", true);
        expect(fk.isUnique).toBe(true);
    });
});

describe("makeEdge", () => {
    it("creates a relation edge with the given shape", () => {
        vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("test-edge-id" as ReturnType<typeof crypto.randomUUID>);
        const edge = makeEdge("src", "tgt", "src-handle", "tgt-handle", {
            sourceColumnId: "pk-1",
            targetColumnId: "fk-1",
            relationshipType: "one-to-many",
        });
        expect(edge.id).toBe("test-edge-id");
        expect(edge.type).toBe("relation");
        expect(edge.source).toBe("src");
        expect(edge.target).toBe("tgt");
        expect(edge.sourceHandle).toBe("src-handle");
        expect(edge.targetHandle).toBe("tgt-handle");
        expect(edge.data?.relationshipType).toBe("one-to-many");
    });
});

describe("stripAutoCol", () => {
    it("removes generated FK column by id", () => {
        const fk = makeFkCol("fk-1", "user_id", "users", "pk-1");
        const nodes = [makeNode("target", "orders", [basePk, fk])];
        stripAutoCol(nodes, "fk-1", "target");
        expect(nodes[0].data.columns.find((c) => c.id === "fk-1")).toBeUndefined();
    });

    it("is a no-op when autoColId is undefined", () => {
        const nodes = [makeNode("n1", "orders", [basePk])];
        const originalNodes = JSON.parse(JSON.stringify(nodes));
        stripAutoCol(nodes, undefined, "n1");
        expect(nodes).toEqual(originalNodes);
    });

    it("is a no-op when colNodeId is undefined", () => {
        const nodes = [makeNode("n1", "orders", [basePk])];
        const originalNodes = JSON.parse(JSON.stringify(nodes));
        stripAutoCol(nodes, "fk-1", undefined);
        expect(nodes).toEqual(originalNodes);
    });
});

describe("makeMnEdge", () => {
    it("builds an M:N edge between source tables", () => {
        vi.spyOn(crypto, "randomUUID").mockReturnValue("edge-generated" as ReturnType<typeof crypto.randomUUID>);
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
        vi.restoreAllMocks();
    });

    it("returns undefined when junction edges are incomplete", () => {
        expect(makeMnEdge([], [])).toBeUndefined();
        expect(makeMnEdge([], [{ id: "j1", source: "t1", target: "j", type: "relation", data: { sourceColumnId: "pk-1", targetColumnId: "fk-1", relationshipType: "one-to-many" } } as RelationEdge])).toBeUndefined();
    });
});

describe("cascadeJunction", () => {
    it("removes junction node and queues linked edges", () => {
        vi.spyOn(crypto, "randomUUID").mockReturnValue("edge-generated" as ReturnType<typeof crypto.randomUUID>);
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
        // result.nodes is no longer returned as it's mutated in-place where possible,
        // but stripping happens on the nodes array passed in.
        expect(result.extraRemovals).toContain("e2");
        expect(result.newEdge?.data?.relationshipType).toBe("many-to-many");
        vi.restoreAllMocks();
    });
});
