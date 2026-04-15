import type { TableNode, RelationEdge, RelationEdgeData } from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import { handleIds } from "../utils/handleIds";
import pluralize from "pluralize";

// ── Node patchers ─────────────────────────────────────────────────────────────

/** Spread-merge a patch into a single node's `data`. */
export function patchNode(
    nodes: TableNode[],
    id: string,
    patch: Partial<TableNode["data"]>,
): TableNode[] {
    return nodes.map((n) =>
        n.id !== id ? n : { ...n, data: { ...n.data, ...patch } },
    );
}

/** Map over the columns of a single node. */
export function patchColumns(
    nodes: TableNode[],
    id: string,
    fn: (cols: DbColumn[]) => DbColumn[],
): TableNode[] {
    return nodes.map((n) =>
        n.id !== id ? n : { ...n, data: { ...n.data, columns: fn(n.data.columns) } },
    );
}

/** Remove one auto-created FK column from the node that owns it. */
export function stripAutoCol(
    nodes: TableNode[],
    autoColId: string | undefined,
    colNodeId: string | undefined,
): TableNode[] {
    if (!autoColId || !colNodeId) return nodes;
    return patchColumns(nodes, colNodeId, (cols) => cols.filter((c) => c.id !== autoColId));
}

// ── Naming helpers ────────────────────────────────────────────────────────────

/** Canonical FK column name derived from the referenced table name. */
export const singularizeTableName = (tableName: string) => {
    return pluralize.singular(tableName.trim().toLowerCase());
};

/** Canonical FK column name derived from singular referenced table name. */
export const defaultFkColumnName = (tableName: string) =>
    `${singularizeTableName(tableName)}_id`;

/**
 * Inserts a new FK column right after the PK/FK block.
 * Order becomes: PK(s), FK(s), then user-defined non-key columns.
 */
export function insertForeignKeyColumn(
    columns: DbColumn[],
    fkColumn: DbColumn,
): DbColumn[] {
    const insertAt = columns.findIndex(
        (c) => !c.isPrimaryKey && !c.isForeignKey,
    );
    if (insertAt === -1) return [...columns, fkColumn];
    return [
        ...columns.slice(0, insertAt),
        fkColumn,
        ...columns.slice(insertAt),
    ];
}

// ── Column builders ───────────────────────────────────────────────────────────

/** Default primary-key column (used when creating tables). */
export function makePkCol(): DbColumn {
    return {
        id: crypto.randomUUID(),
        name: "id",
        type: "uuid",
        isPrimaryKey: true,
        isForeignKey: false,
        isNullable: false,
        isUnique: true,
    };
}

/** Foreign-key column pointing at another table's column. */
export function makeFkCol(
    id: string,
    name: string,
    tableId: string,
    columnId: string,
    unique = false,
): DbColumn {
    return {
        id,
        name,
        type: "uuid",
        isPrimaryKey: false,
        isForeignKey: true,
        isNullable: false,
        isUnique: unique,
        references: { tableId, columnId },
    };
}

// ── Edge builders ─────────────────────────────────────────────────────────────

/** Relation edge builder — always `type: "relation"`. */
export function makeEdge(
    source: string,
    target: string,
    sourceHandle: string,
    targetHandle: string,
    data: RelationEdgeData,
): RelationEdge {
    return {
        id: crypto.randomUUID(),
        source,
        target,
        sourceHandle,
        targetHandle,
        type: "relation",
        data,
    };
}

/**
 * Build a direct M:N edge between T1 and T2 from a junction-edge pair.
 * Both edges target the junction (T1→junction and T2→junction).
 */
export function makeMnEdge(
    nodes: TableNode[],
    junctionEdges: RelationEdge[],
): RelationEdge | undefined {
    const [e1, e2] = junctionEdges;
    if (!e1 || !e2) return undefined;
    const t1 = nodes.find((n) => n.id === e1.source);
    const t2 = nodes.find((n) => n.id === e2.source);
    const pk1 = t1?.data.columns.find((c) => c.isPrimaryKey);
    const pk2 = t2?.data.columns.find((c) => c.isPrimaryKey);
    if (!t1 || !t2 || !pk1 || !pk2) return undefined;
    return makeEdge(t1.id, t2.id, handleIds(pk1.id).sourceRight, handleIds(pk2.id).targetLeft, {
        sourceColumnId: pk1.id,
        targetColumnId: pk2.id,
        relationshipType: "many-to-many",
    });
}

/**
 * Cascade-delete a junction table: strip FK columns from surviving junction
 * edges, remove the junction node, queue those edges for removal, and produce
 * the replacement direct M:N edge.
 */
export function cascadeJunction(
    nodes: TableNode[],
    edges: RelationEdge[],
    junctionId: string,
    alreadyHandled: Set<string>,
): { nodes: TableNode[]; extraRemovals: string[]; newEdge: RelationEdge | undefined } {
    const junctionEdges = edges.filter((e) => e.data?.junctionTableId === junctionId);
    let updatedNodes = nodes.filter((n) => n.id !== junctionId);
    const extraRemovals: string[] = [];

    for (const je of junctionEdges) {
        if (alreadyHandled.has(je.id)) continue;
        updatedNodes = stripAutoCol(
            updatedNodes,
            je.data?.autoCreatedColumnId,
            je.data?.autoCreatedColumnNodeId ?? je.target,
        );
        extraRemovals.push(je.id);
    }

    return {
        nodes: updatedNodes,
        extraRemovals,
        newEdge: makeMnEdge(nodes, junctionEdges), // use pre-filter nodes for T1/T2 lookup
    };
}
