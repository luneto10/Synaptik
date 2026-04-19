import type {
    BoxNode,
    DiagramNode,
    RelationEdge,
    RelationEdgeData,
    TableNode,
} from "../types/flow.types";
import { isBoxNode, isTableNode } from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import { handleIds } from "../utils/handleIds";
import pluralize from "pluralize";

// ── Node lookup ───────────────────────────────────────────────────────────────

/** Find a node by id and narrow to TableNode. Returns null on miss or on a box. */
export function findTable(nodes: DiagramNode[], id: string): TableNode | null {
    const node = nodes.find((n) => n.id === id);
    return node && isTableNode(node) ? node : null;
}

/** Find a node by id and narrow to BoxNode. Returns null on miss or on a table. */
export function findBox(nodes: DiagramNode[], id: string): BoxNode | null {
    const node = nodes.find((n) => n.id === id);
    return node && isBoxNode(node) ? node : null;
}

/** Table-only view of the node list. Most store helpers don't understand boxes. */
export const tablesOf = (nodes: DiagramNode[]): TableNode[] =>
    nodes.filter(isTableNode);

// ── Node patchers ─────────────────────────────────────────────────────────────

/** 
 * Mutates a node's `data` by spread-merging a patch.
 * Works on Immer drafts or plain objects.
 */
export function patchNode(
    nodes: TableNode[],
    id: string,
    patch: Partial<TableNode["data"]>,
): void {
    const node = nodes.find((n) => n.id === id);
    if (node) {
        node.data = { ...node.data, ...patch };
    }
}

/** 
 * Mutates a node's columns by applying a transformation function.
 * Works on Immer drafts or plain objects.
 */
export function patchColumns(
    nodes: TableNode[],
    id: string,
    fn: (cols: DbColumn[]) => DbColumn[],
): void {
    const node = nodes.find((n) => n.id === id);
    if (node) {
        node.data.columns = fn(node.data.columns);
    }
}

/** 
 * Mutates nodes by removing an auto-created FK column from the owning node.
 * Works on Immer drafts or plain objects.
 */
export function stripAutoCol(
    nodes: TableNode[],
    autoColId: string | undefined,
    colNodeId: string | undefined,
): void {
    if (!autoColId || !colNodeId) return;
    patchColumns(nodes, colNodeId, (cols) => cols.filter((c) => c.id !== autoColId));
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
 * Returns a NEW array for use with assignment.
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
    const t1OnLeft = (t1.position?.x ?? 0) <= (t2.position?.x ?? 0);
    return makeEdge(
        t1.id, t2.id,
        t1OnLeft ? handleIds(pk1.id).sourceRight : handleIds(pk1.id).sourceLeft,
        t1OnLeft ? handleIds(pk2.id).targetLeft  : handleIds(pk2.id).targetRight,
        { sourceColumnId: pk1.id, targetColumnId: pk2.id, relationshipType: "many-to-many" },
    );
}

/**
 * Cascade-delete a junction table: strip FK columns from surviving junction
 * edges, remove the junction node, queue those edges for removal, and produce
 * the replacement direct M:N edge.
 * Mutates the draft in-place where possible, but returns necessary info for edges.
 */
export function cascadeJunction(
    nodes: TableNode[],
    edges: RelationEdge[],
    junctionId: string,
    alreadyHandled: Set<string>,
): { extraRemovals: string[]; newEdge: RelationEdge | undefined } {
    const junctionEdges = edges.filter((e) => e.data?.junctionTableId === junctionId);
    const extraRemovals: string[] = [];

    for (const je of junctionEdges) {
        if (alreadyHandled.has(je.id)) continue;
        stripAutoCol(
            nodes,
            je.data?.autoCreatedColumnId,
            je.data?.autoCreatedColumnNodeId ?? je.target,
        );
        extraRemovals.push(je.id);
    }

    return {
        extraRemovals,
        newEdge: makeMnEdge(nodes, junctionEdges),
    };
}
