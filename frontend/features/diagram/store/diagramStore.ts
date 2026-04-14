import { create } from "zustand";
import { temporal } from "zundo";
import {
    type TableNode,
    type RelationEdge,
    TABLE_NODE_TYPE,
    type RelationEdgeData,
    type RelationshipType,
} from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import {
    applyEdgeChanges,
    applyNodeChanges,
    Connection,
    EdgeChange,
    NodeChange,
} from "@xyflow/react";
import { LAYOUT } from "../constants";

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Spread-merge a patch into a single node's `data`. */
function patchNode(
    nodes: TableNode[],
    id: string,
    patch: Partial<TableNode["data"]>,
): TableNode[] {
    return nodes.map((n) =>
        n.id !== id ? n : { ...n, data: { ...n.data, ...patch } },
    );
}

/** Map over the columns of a single node. */
function patchColumns(
    nodes: TableNode[],
    id: string,
    fn: (cols: DbColumn[]) => DbColumn[],
): TableNode[] {
    return nodes.map((n) =>
        n.id !== id
            ? n
            : { ...n, data: { ...n.data, columns: fn(n.data.columns) } },
    );
}

/** Remove one auto-created FK column from the node that owns it. */
function stripAutoCol(
    nodes: TableNode[],
    autoColId: string | undefined,
    colNodeId: string | undefined,
): TableNode[] {
    if (!autoColId || !colNodeId) return nodes;
    return patchColumns(nodes, colNodeId, (cols) =>
        cols.filter((c) => c.id !== autoColId),
    );
}

/** Default primary-key column (used when creating tables). */
function makePkCol(): DbColumn {
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
function makeFkCol(
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

/** Relation edge builder — always `type: "relation"`. */
function makeEdge(
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
 * Both edges target the junction (T1→junction and T2→junction), so T1 and T2
 * are their respective sources.
 */
function makeMnEdge(
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
    return makeEdge(t1.id, t2.id, `${pk1.id}-source`, `${pk2.id}-target`, {
        sourceColumnId: pk1.id,
        targetColumnId: pk2.id,
        relationshipType: "many-to-many",
    });
}

/**
 * Cascade-delete a junction table: strip FK columns from surviving junction
 * edges, remove the junction node, queue those edges for removal, and produce
 * the replacement direct M:N edge.
 *
 * @param alreadyHandled  edge IDs whose FK has already been stripped upstream
 */
function cascadeJunction(
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

// ── Store interface ───────────────────────────────────────────────────────────

interface DiagramState {
    nodes: TableNode[];
    edges: RelationEdge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    /**
     * Creates an edge between two tables.
     * Always connects from the source table's PK column to a new FK column
     * that is auto-created in the target table.
     */
    addEdgeWithType: (
        connection: Connection,
        fkName: string,
        type: RelationshipType,
    ) => void;
    setEdgeRelationType: (edgeId: string, type: RelationshipType) => void;
    /** Deletes the edge and removes the auto-created FK column from its node. */
    deleteEdge: (edgeId: string) => void;
    addTable: (name: string) => void;
    updateColumn: (nodeId: string, column: DbColumn) => void;
    addColumn: (nodeId: string, columnId?: string) => void;
    removeColumn: (nodeId: string, columnId: string) => void;
    renameTable: (nodeId: string, name: string) => void;
    deleteTable: (nodeId: string) => void;
    /** Creates a junction table for M:N and wires it with 1:N edges to both parent tables. */
    createJunctionTable: (sourceNodeId: string, targetNodeId: string) => void;
    /** Replaces the entire diagram state (nodes + edges) — used for loading saved or mock data. */
    loadDiagram: (nodes: TableNode[], edges: RelationEdge[]) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDiagramStore = create<DiagramState>()(
    temporal(
        (set) => ({
            nodes: [],
            edges: [],

            onNodesChange: (changes) =>
                set((s) => ({
                    nodes: applyNodeChanges(changes, s.nodes) as TableNode[],
                })),

            onEdgesChange: (changes) =>
                set((s) => {
                    const removeIds = new Set(
                        changes.filter((c) => c.type === "remove").map((c) => c.id),
                    );
                    // Fast path — no removals (position/selection changes etc.)
                    if (removeIds.size === 0) {
                        return { edges: applyEdgeChanges(changes, s.edges) as RelationEdge[] };
                    }

                    let nodes = s.nodes;
                    const extraRemovals: string[] = [];
                    const newEdges: RelationEdge[] = [];
                    const handledJunctions = new Set<string>();

                    for (const id of removeIds) {
                        const edge = s.edges.find((e) => e.id === id);
                        if (!edge) continue;

                        // FK column cleanup
                        nodes = stripAutoCol(
                            nodes,
                            edge.data?.autoCreatedColumnId,
                            edge.data?.autoCreatedColumnNodeId ?? edge.target,
                        );

                        // Junction cascade
                        const jId = edge.data?.junctionTableId;
                        if (!jId || handledJunctions.has(jId)) continue;
                        handledJunctions.add(jId);

                        const junctionEdges = s.edges.filter(
                            (e) => e.data?.junctionTableId === jId,
                        );
                        const allBeingRemoved = junctionEdges.every((e) => removeIds.has(e.id));

                        if (allBeingRemoved) {
                            // Junction NODE was deleted by ReactFlow — it removes the node
                            // via onNodesChange; we only need to restore the M:N edge.
                            // FKs in the junction are gone with the node; nothing to strip.
                            const mn = makeMnEdge(s.nodes, junctionEdges);
                            if (mn) newEdges.push(mn);
                        } else {
                            // Single edge deleted → cascade: remove junction + other edge
                            const { nodes: n, extraRemovals: extra, newEdge } =
                                cascadeJunction(nodes, s.edges, jId, new Set([id]));
                            nodes = n;
                            extraRemovals.push(...extra);
                            if (newEdge) newEdges.push(newEdge);
                        }
                    }

                    const allChanges =
                        extraRemovals.length > 0
                            ? [...changes, ...extraRemovals.map((id) => ({ type: "remove" as const, id }))]
                            : changes;

                    return {
                        edges: [...(applyEdgeChanges(allChanges, s.edges) as RelationEdge[]), ...newEdges],
                        nodes,
                    };
                }),

            addEdgeWithType: (connection, fkName, type) =>
                set((s) => {
                    const sourceNode = s.nodes.find((n) => n.id === connection.source);
                    const targetNode = s.nodes.find((n) => n.id === connection.target);
                    if (!sourceNode || !targetNode) return s;

                    const pkCol = sourceNode.data.columns.find((c) => c.isPrimaryKey);
                    if (!pkCol) return s;

                    // Guard against duplicate FK names in the target table
                    let resolvedName = fkName;
                    let counter = 2;
                    while (targetNode.data.columns.some((c) => c.name === resolvedName)) {
                        resolvedName = `${fkName}_${counter++}`;
                    }

                    const fkColId = crypto.randomUUID();
                    const fkCol = makeFkCol(
                        fkColId,
                        resolvedName,
                        connection.source!,
                        pkCol.id,
                        type === "one-to-one",
                    );
                    const edge = makeEdge(
                        connection.source!,
                        connection.target!,
                        `${pkCol.id}-source`,
                        `${fkColId}-target`,
                        {
                            sourceColumnId: pkCol.id,
                            targetColumnId: fkColId,
                            relationshipType: type,
                            autoCreatedColumnId: fkColId,
                        },
                    );

                    return {
                        edges: [...s.edges, edge],
                        nodes: patchColumns(s.nodes, connection.target!, (cols) => [
                            ...cols,
                            fkCol,
                        ]),
                    };
                }),

            setEdgeRelationType: (edgeId, type) =>
                set((s) => ({
                    edges: s.edges.map((e) =>
                        e.id !== edgeId
                            ? e
                            : { ...e, data: { ...e.data!, relationshipType: type } },
                    ),
                })),

            deleteEdge: (edgeId) =>
                set((s) => {
                    const edge = s.edges.find((e) => e.id === edgeId);
                    if (!edge) return s;

                    let nodes = stripAutoCol(
                        s.nodes,
                        edge.data?.autoCreatedColumnId,
                        edge.data?.autoCreatedColumnNodeId ?? edge.target,
                    );
                    let edges = s.edges.filter((e) => e.id !== edgeId);

                    const jId = edge.data?.junctionTableId;
                    if (jId) {
                        const { nodes: n, extraRemovals, newEdge } =
                            cascadeJunction(nodes, s.edges, jId, new Set([edgeId]));
                        nodes = n;
                        edges = edges.filter((e) => !extraRemovals.includes(e.id));
                        if (newEdge) edges = [...edges, newEdge];
                    }

                    return { edges, nodes };
                }),

            addTable: (name) =>
                set((s) => {
                    const id = crypto.randomUUID();
                    const col = s.nodes.length;
                    const row = Math.floor(col / LAYOUT.COLS);
                    return {
                        nodes: [
                            ...s.nodes,
                            {
                                id,
                                type: TABLE_NODE_TYPE,
                                position: {
                                    x: LAYOUT.ORIGIN_X + (col % LAYOUT.COLS) * LAYOUT.GAP_X,
                                    y: LAYOUT.ORIGIN_Y + row * LAYOUT.GAP_Y,
                                },
                                data: { id, name, columns: [makePkCol()] },
                            },
                        ],
                    };
                }),

            addColumn: (nodeId, columnId) =>
                set((s) => ({
                    nodes: patchColumns(s.nodes, nodeId, (cols) => [
                        ...cols,
                        {
                            id: columnId ?? crypto.randomUUID(),
                            name: "column_name",
                            type: "text",
                            isPrimaryKey: false,
                            isForeignKey: false,
                            isNullable: true,
                            isUnique: false,
                        },
                    ]),
                })),

            updateColumn: (nodeId, column) =>
                set((s) => ({
                    nodes: patchColumns(s.nodes, nodeId, (cols) =>
                        cols.map((c) => (c.id === column.id ? column : c)),
                    ),
                })),

            removeColumn: (nodeId, columnId) =>
                set((s) => ({
                    nodes: patchColumns(s.nodes, nodeId, (cols) =>
                        cols.filter((c) => c.id !== columnId),
                    ),
                })),

            renameTable: (nodeId, name) =>
                set((s) => ({ nodes: patchNode(s.nodes, nodeId, { name }) })),

            deleteTable: (nodeId) =>
                set((s) => {
                    // Remove FK columns auto-created by edges originating from this node
                    let nodes = s.nodes.filter((n) => n.id !== nodeId);
                    for (const edge of s.edges.filter((e) => e.source === nodeId)) {
                        nodes = stripAutoCol(
                            nodes,
                            edge.data?.autoCreatedColumnId,
                            edge.data?.autoCreatedColumnNodeId ?? edge.target,
                        );
                    }

                    const filteredEdges = s.edges.filter(
                        (e) => e.source !== nodeId && e.target !== nodeId,
                    );

                    // If this is a junction table, restore a direct M:N edge
                    const junctionEdges = s.edges.filter(
                        (e) => e.data?.junctionTableId === nodeId,
                    );
                    if (junctionEdges.length > 0) {
                        const mn = makeMnEdge(s.nodes, junctionEdges);
                        if (mn) return { nodes, edges: [...filteredEdges, mn] };
                    }

                    return { nodes, edges: filteredEdges };
                }),

            createJunctionTable: (sourceNodeId, targetNodeId) =>
                set((s) => {
                    const sourceNode = s.nodes.find((n) => n.id === sourceNodeId);
                    const targetNode = s.nodes.find((n) => n.id === targetNodeId);
                    if (!sourceNode || !targetNode) return s;

                    const sourcePk = sourceNode.data.columns.find((c) => c.isPrimaryKey);
                    const targetPk = targetNode.data.columns.find((c) => c.isPrimaryKey);
                    if (!sourcePk || !targetPk) return s;

                    const junctionId = crypto.randomUUID();
                    const fkSourceColId = crypto.randomUUID();
                    const fkTargetColId = crypto.randomUUID();

                    const junctionX = sourceNode.position.x + LAYOUT.JUNCTION_GAP;
                    const junctionY =
                        (sourceNode.position.y + targetNode.position.y) / 2;

                    const junctionNode: TableNode = {
                        id: junctionId,
                        type: TABLE_NODE_TYPE,
                        position: { x: junctionX, y: junctionY },
                        data: {
                            id: junctionId,
                            name: `${sourceNode.data.name}_${targetNode.data.name}`,
                            columns: [
                                makePkCol(),
                                makeFkCol(
                                    fkSourceColId,
                                    `${sourceNode.data.name}_id`,
                                    sourceNodeId,
                                    sourcePk.id,
                                ),
                                makeFkCol(
                                    fkTargetColId,
                                    `${targetNode.data.name}_id`,
                                    targetNodeId,
                                    targetPk.id,
                                ),
                            ],
                        },
                    };

                    // Edge 1: T1 → junction  (T1's RIGHT source → junction's LEFT target)
                    // Edge 2: T2 → junction  (T2's LEFT  source → junction's RIGHT target)
                    //   T2 exits from its left side so both arrows point inward:
                    //   T1 ─|──► junction ◄──|─ T2
                    const edgeToSource = makeEdge(
                        sourceNodeId,
                        junctionId,
                        `${sourcePk.id}-source`,
                        `${fkSourceColId}-target`,          // left target on junction
                        {
                            sourceColumnId: sourcePk.id,
                            targetColumnId: fkSourceColId,
                            relationshipType: "one-to-many",
                            autoCreatedColumnId: fkSourceColId,
                            junctionTableId: junctionId,
                        },
                    );
                    const edgeToTarget = makeEdge(
                        targetNodeId,
                        junctionId,
                        `${targetPk.id}-source-left`,       // LEFT source on T2 → exits left
                        `${fkTargetColId}-target-right`,    // RIGHT target on junction
                        {
                            sourceColumnId: targetPk.id,
                            targetColumnId: fkTargetColId,
                            relationshipType: "one-to-many",
                            autoCreatedColumnId: fkTargetColId,
                            junctionTableId: junctionId,
                        },
                    );

                    // Reposition T2 to the right of the junction.
                    const updatedNodes = s.nodes.map((n) =>
                        n.id !== targetNodeId
                            ? n
                            : { ...n, position: { x: junctionX + LAYOUT.JUNCTION_GAP, y: junctionY } },
                    );

                    return {
                        nodes: [...updatedNodes, junctionNode],
                        edges: [...s.edges, edgeToSource, edgeToTarget],
                    };
                }),

            loadDiagram: (nodes, edges) => set({ nodes, edges }),
        }),
        { limit: 50 },
    ),
);
