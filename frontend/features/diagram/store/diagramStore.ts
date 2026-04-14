import { create } from "zustand";
import {
    type TableNode,
    type RelationEdge,
    TABLE_NODE_TYPE,
} from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import type { RelationEdgeData } from "../types/flow.types";
import {
    addEdge,
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
    addEdgeWithType: (
        connection: Connection,
        sourceColId: string,
        targetColId: string,
        type: RelationshipType,
    ) => void;
    setEdgeRelationType: (edgeId: string, type: RelationshipType) => void;
    deleteEdge: (edgeId: string) => void;
    addTable: (name: string) => void;
    updateColumn: (nodeId: string, column: DbColumn) => void;
    addColumn: (nodeId: string) => void;
    removeColumn: (nodeId: string, columnId: string) => void;
    renameTable: (nodeId: string, name: string) => void;
    deleteTable: (nodeId: string) => void;
    /** Creates a junction table for M:N and wires it with 1:N edges to both parent tables */
    createJunctionTable: (
        sourceNodeId: string,
        targetNodeId: string,
        sourceColId: string,
        targetColId: string,
    ) => void;
}

export const useDiagramStore = create<DiagramState>()((set) => ({
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

    addEdgeWithType: (connection, sourceColId, targetColId, type) =>
        set((s) => ({
            edges: addEdge(
                {
                    ...connection,
                    type: "relation",
                    data: {
                        sourceColumnId: sourceColId,
                        targetColumnId: targetColId,
                        relationshipType: type,
                    },
                },
                s.edges,
            ) as RelationEdge[],
        })),

    setEdgeRelationType: (edgeId, type) =>
        set((s) => ({
            edges: s.edges.map((e) =>
                e.id !== edgeId
                    ? e
                    : {
                          ...e,
                          data: {
                              ...e.data!,
                              relationshipType: type,
                          },
                      },
            ),
        })),

    deleteEdge: (edgeId) =>
        set((s) => ({
            edges: s.edges.filter((e) => e.id !== edgeId),
        })),

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
        set((s) => ({
            nodes: s.nodes.filter((n) => n.id !== nodeId),
            edges: s.edges.filter(
                (e) => e.source !== nodeId && e.target !== nodeId,
            ),
        })),

    createJunctionTable: (sourceNodeId, targetNodeId, sourceColId, targetColId) =>
        set((s) => {
            const sourceNode = s.nodes.find((n) => n.id === sourceNodeId);
            const targetNode = s.nodes.find((n) => n.id === targetNodeId);
            if (!sourceNode || !targetNode) return s;

            const junctionId = crypto.randomUUID();
            const junctionName = `${sourceNode.data.name}_${targetNode.data.name}`;

            // Position the junction table between the two parents
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
                            references: { tableId: sourceNodeId, columnId: sourceColId },
                        },
                        {
                            id: fkTargetColId,
                            name: `${targetNode.data.name}_id`,
                            type: "uuid",
                            isPrimaryKey: false,
                            isForeignKey: true,
                            isNullable: false,
                            isUnique: false,
                            references: { tableId: targetNodeId, columnId: targetColId },
                        },
                    ],
                },
            };

            const edgeToSource: RelationEdge = {
                id: crypto.randomUUID(),
                source: sourceNodeId,
                target: junctionId,
                sourceHandle: `${sourceColId}-source`,
                targetHandle: `${fkSourceColId}-target`,
                type: "relation",
                data: {
                    sourceColumnId: sourceColId,
                    targetColumnId: fkSourceColId,
                    relationshipType: "one-to-many",
                },
            };

            const edgeToTarget: RelationEdge = {
                id: crypto.randomUUID(),
                source: targetNodeId,
                target: junctionId,
                sourceHandle: `${targetColId}-source`,
                targetHandle: `${fkTargetColId}-target`,
                type: "relation",
                data: {
                    sourceColumnId: targetColId,
                    targetColumnId: fkTargetColId,
                    relationshipType: "one-to-many",
                },
            };

            return {
                nodes: [...s.nodes, junctionNode],
                edges: [...s.edges, edgeToSource, edgeToTarget],
            };
        }),
}));
