import { create } from "zustand";
import { temporal } from "zundo";
import {
    type TableNode,
    type RelationEdge,
    TABLE_NODE_TYPE,
} from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import type { RelationEdgeData } from "../types/flow.types";
import {
    applyEdgeChanges,
    applyNodeChanges,
    Connection,
    EdgeChange,
    NodeChange,
} from "@xyflow/react";

type RelationshipType = RelationEdgeData["relationshipType"];

interface DiagramState {
    nodes: TableNode[];
    edges: RelationEdge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    /**
     * Creates an edge between two tables.
     * Always connects from the source table's PK column to a new FK column
     * that is auto-created in the target table.
     *
     * @param connection  ReactFlow connection object (source/target node IDs)
     * @param fkName      Name for the new FK column (e.g. "user_id")
     * @param type        Relationship type
     */
    addEdgeWithType: (
        connection: Connection,
        fkName: string,
        type: RelationshipType,
    ) => void;
    setEdgeRelationType: (edgeId: string, type: RelationshipType) => void;
    /** Deletes the edge and removes the auto-created FK column from the target node */
    deleteEdge: (edgeId: string) => void;
    addTable: (name: string) => void;
    updateColumn: (nodeId: string, column: DbColumn) => void;
    addColumn: (nodeId: string) => void;
    removeColumn: (nodeId: string, columnId: string) => void;
    renameTable: (nodeId: string, name: string) => void;
    deleteTable: (nodeId: string) => void;
    /** Creates a junction table for M:N and wires it with 1:N edges to both parent tables */
    createJunctionTable: (sourceNodeId: string, targetNodeId: string) => void;
}

export const useDiagramStore = create<DiagramState>()(
    temporal(
        (set, get) => ({
            nodes: [],
            edges: [],

            onNodesChange: (changes) =>
                set((s) => ({
                    nodes: applyNodeChanges(changes, s.nodes) as TableNode[],
                })),

            onEdgesChange: (changes) =>
                set((s) => ({
                    edges: applyEdgeChanges(changes, s.edges) as RelationEdge[],
                })),

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
                    const fkCol: DbColumn = {
                        id: fkColId,
                        name: resolvedName,
                        type: "uuid",
                        isPrimaryKey: false,
                        isForeignKey: true,
                        isNullable: false,
                        isUnique: type === "one-to-one",
                        references: {
                            tableId: connection.source!,
                            columnId: pkCol.id,
                        },
                    };

                    const newEdge: RelationEdge = {
                        id: crypto.randomUUID(),
                        source: connection.source!,
                        target: connection.target!,
                        sourceHandle: `${pkCol.id}-source`,
                        targetHandle: `${fkColId}-target`,
                        type: "relation",
                        data: {
                            sourceColumnId: pkCol.id,
                            targetColumnId: fkColId,
                            relationshipType: type,
                            autoCreatedColumnId: fkColId,
                        },
                    };

                    return {
                        edges: [...s.edges, newEdge],
                        nodes: s.nodes.map((n) =>
                            n.id !== connection.target
                                ? n
                                : {
                                      ...n,
                                      data: {
                                          ...n.data,
                                          columns: [...n.data.columns, fkCol],
                                      },
                                  },
                        ),
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
                    const autoColId = edge?.data?.autoCreatedColumnId;
                    const targetNodeId = edge?.target;

                    return {
                        edges: s.edges.filter((e) => e.id !== edgeId),
                        nodes:
                            autoColId && targetNodeId
                                ? s.nodes.map((n) =>
                                      n.id !== targetNodeId
                                          ? n
                                          : {
                                                ...n,
                                                data: {
                                                    ...n.data,
                                                    columns: n.data.columns.filter(
                                                        (c) => c.id !== autoColId,
                                                    ),
                                                },
                                            },
                                  )
                                : s.nodes,
                    };
                }),

            addTable: (name) =>
                set((s) => {
                    const id = crypto.randomUUID();
                    const col = s.nodes.length;
                    const row = Math.floor(col / 4);
                    return {
                        nodes: [
                            ...s.nodes,
                            {
                                id,
                                type: TABLE_NODE_TYPE,
                                position: {
                                    x: 80 + (col % 4) * 340,
                                    y: 80 + row * 260,
                                },
                                data: {
                                    id,
                                    name,
                                    columns: [
                                        {
                                            id: crypto.randomUUID(),
                                            name: "id",
                                            type: "uuid",
                                            isPrimaryKey: true,
                                            isForeignKey: false,
                                            isNullable: false,
                                            isUnique: true,
                                        },
                                    ],
                                },
                            },
                        ],
                    };
                }),

            addColumn: (nodeId) =>
                set((s) => ({
                    nodes: s.nodes.map((n) =>
                        n.id !== nodeId
                            ? n
                            : {
                                  ...n,
                                  data: {
                                      ...n.data,
                                      columns: [
                                          ...n.data.columns,
                                          {
                                              id: crypto.randomUUID(),
                                              name: "column_name",
                                              type: "text",
                                              isPrimaryKey: false,
                                              isForeignKey: false,
                                              isNullable: true,
                                              isUnique: false,
                                          },
                                      ],
                                  },
                              },
                    ),
                })),

            updateColumn: (nodeId, column) =>
                set((s) => ({
                    nodes: s.nodes.map((n) =>
                        n.id !== nodeId
                            ? n
                            : {
                                  ...n,
                                  data: {
                                      ...n.data,
                                      columns: n.data.columns.map((c) =>
                                          c.id === column.id ? column : c,
                                      ),
                                  },
                              },
                    ),
                })),

            removeColumn: (nodeId, columnId) =>
                set((s) => ({
                    nodes: s.nodes.map((n) =>
                        n.id !== nodeId
                            ? n
                            : {
                                  ...n,
                                  data: {
                                      ...n.data,
                                      columns: n.data.columns.filter(
                                          (c) => c.id !== columnId,
                                      ),
                                  },
                              },
                    ),
                })),

            renameTable: (nodeId, name) =>
                set((s) => ({
                    nodes: s.nodes.map((n) =>
                        n.id !== nodeId ? n : { ...n, data: { ...n.data, name } },
                    ),
                })),

            deleteTable: (nodeId) =>
                set((s) => {
                    // When deleting a table, also clean up auto-created FK columns
                    // that were generated by edges pointing TO this table
                    const edgesGoingToNode = s.edges.filter((e) => e.target === nodeId);
                    const edgesFromNode = s.edges.filter((e) => e.source === nodeId);

                    // FK columns auto-created IN OTHER tables because of edges FROM this node
                    let nodes = s.nodes.filter((n) => n.id !== nodeId);
                    for (const edge of edgesFromNode) {
                        const autoColId = edge.data?.autoCreatedColumnId;
                        if (!autoColId) continue;
                        nodes = nodes.map((n) =>
                            n.id !== edge.target
                                ? n
                                : {
                                      ...n,
                                      data: {
                                          ...n.data,
                                          columns: n.data.columns.filter(
                                              (c) => c.id !== autoColId,
                                          ),
                                      },
                                  },
                        );
                    }

                    return {
                        nodes,
                        edges: s.edges.filter(
                            (e) => e.source !== nodeId && e.target !== nodeId,
                        ),
                    };
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
                    const junctionName = `${sourceNode.data.name}_${targetNode.data.name}`;

                    const midX = (sourceNode.position.x + targetNode.position.x) / 2;
                    const midY = (sourceNode.position.y + targetNode.position.y) / 2 + 180;

                    const fkSourceColId = crypto.randomUUID();
                    const fkTargetColId = crypto.randomUUID();

                    const junctionNode: TableNode = {
                        id: junctionId,
                        type: TABLE_NODE_TYPE,
                        position: { x: midX, y: midY },
                        data: {
                            id: junctionId,
                            name: junctionName,
                            columns: [
                                {
                                    id: crypto.randomUUID(),
                                    name: "id",
                                    type: "uuid",
                                    isPrimaryKey: true,
                                    isForeignKey: false,
                                    isNullable: false,
                                    isUnique: true,
                                },
                                {
                                    id: fkSourceColId,
                                    name: `${sourceNode.data.name}_id`,
                                    type: "uuid",
                                    isPrimaryKey: false,
                                    isForeignKey: true,
                                    isNullable: false,
                                    isUnique: false,
                                    references: { tableId: sourceNodeId, columnId: sourcePk.id },
                                },
                                {
                                    id: fkTargetColId,
                                    name: `${targetNode.data.name}_id`,
                                    type: "uuid",
                                    isPrimaryKey: false,
                                    isForeignKey: true,
                                    isNullable: false,
                                    isUnique: false,
                                    references: { tableId: targetNodeId, columnId: targetPk.id },
                                },
                            ],
                        },
                    };

                    const edgeToSource: RelationEdge = {
                        id: crypto.randomUUID(),
                        source: sourceNodeId,
                        target: junctionId,
                        sourceHandle: `${sourcePk.id}-source`,
                        targetHandle: `${fkSourceColId}-target`,
                        type: "relation",
                        data: {
                            sourceColumnId: sourcePk.id,
                            targetColumnId: fkSourceColId,
                            relationshipType: "one-to-many",
                            autoCreatedColumnId: fkSourceColId,
                        },
                    };

                    const edgeToTarget: RelationEdge = {
                        id: crypto.randomUUID(),
                        source: targetNodeId,
                        target: junctionId,
                        sourceHandle: `${targetPk.id}-source`,
                        targetHandle: `${fkTargetColId}-target`,
                        type: "relation",
                        data: {
                            sourceColumnId: targetPk.id,
                            targetColumnId: fkTargetColId,
                            relationshipType: "one-to-many",
                            autoCreatedColumnId: fkTargetColId,
                        },
                    };

                    return {
                        nodes: [...s.nodes, junctionNode],
                        edges: [...s.edges, edgeToSource, edgeToTarget],
                    };
                }),
        }),
        { limit: 50 },
    ),
);
