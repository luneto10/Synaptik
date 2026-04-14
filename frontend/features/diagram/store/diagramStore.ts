import { create } from "zustand";
import {
    type TableNode,
    type RelationEdge,
    TABLE_NODE_TYPE,
} from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import {
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    Connection,
    EdgeChange,
    NodeChange,
} from "@xyflow/react";

interface DiagramState {
    nodes: TableNode[];
    edges: RelationEdge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    addTable: (name: string) => void;
    updateColumn: (nodeId: string, column: DbColumn) => void;
    addColumn: (nodeId: string) => void;
    removeColumn: (nodeId: string, columnId: string) => void;
    renameTable: (nodeId: string, name: string) => void;
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

    onConnect: (connection) =>
        set((s) => ({
            edges: addEdge(
                {
                    ...connection,
                    data: {
                        sourceColumnId: "",
                        targetColumnId: "",
                        relationshipType: "one-to-many",
                    },
                },
                s.edges,
            ) as RelationEdge[],
        })),

    addTable: (name) =>
        set((s) => {
            const id = crypto.randomUUID();
            return {
                nodes: [
                    ...s.nodes,
                    {
                        id,
                        type: TABLE_NODE_TYPE,
                        position: { x: 80 + s.nodes.length * 320, y: 80 },
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
}));
