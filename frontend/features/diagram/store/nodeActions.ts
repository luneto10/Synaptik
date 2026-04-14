import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import { TABLE_NODE_TYPE, type TableNode, type RelationEdge } from "../types/flow.types";
import type { DbColumn } from "../types/db.types";
import { LAYOUT } from "../constants";
import { makePkCol, makeFkCol, makeEdge, makeMnEdge, patchNode, patchColumns, stripAutoCol } from "./helpers";
import type { SetState } from "./diagramStore.types";

export function createNodeActions(set: SetState) {
    return {
        onNodesChange: (changes: NodeChange[]) =>
            set((s) => ({
                nodes: applyNodeChanges(changes, s.nodes) as TableNode[],
            })),

        addTable: (name: string) =>
            set((s) => {
                const id = crypto.randomUUID();
                const col = s.nodes.length;
                const row = Math.floor(col / LAYOUT.COLS);
                const node: TableNode = {
                    id,
                    type: TABLE_NODE_TYPE,
                    position: {
                        x: LAYOUT.ORIGIN_X + (col % LAYOUT.COLS) * LAYOUT.GAP_X,
                        y: LAYOUT.ORIGIN_Y + row * LAYOUT.GAP_Y,
                    },
                    data: { id, name, columns: [makePkCol()] },
                };
                return { nodes: [...s.nodes, node] };
            }),

        addColumn: (nodeId: string, columnId?: string) =>
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

        updateColumn: (nodeId: string, column: DbColumn) =>
            set((s) => ({
                nodes: patchColumns(s.nodes, nodeId, (cols) =>
                    cols.map((c) => (c.id === column.id ? column : c)),
                ),
            })),

        removeColumn: (nodeId: string, columnId: string) =>
            set((s) => ({
                nodes: patchColumns(s.nodes, nodeId, (cols) =>
                    cols.filter((c) => c.id !== columnId),
                ),
            })),

        renameTable: (nodeId: string, name: string) =>
            set((s) => ({ nodes: patchNode(s.nodes, nodeId, { name }) })),

        deleteTable: (nodeId: string) =>
            set((s) => {
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
                const junctionEdges = s.edges.filter(
                    (e) => e.data?.junctionTableId === nodeId,
                );
                if (junctionEdges.length > 0) {
                    const mn = makeMnEdge(s.nodes, junctionEdges);
                    if (mn) return { nodes, edges: [...filteredEdges, mn] };
                }
                return { nodes, edges: filteredEdges };
            }),

        createJunctionTable: (sourceNodeId: string, targetNodeId: string) =>
            set((s) => {
                const sourceNode = s.nodes.find((n) => n.id === sourceNodeId);
                const targetNode = s.nodes.find((n) => n.id === targetNodeId);
                if (!sourceNode || !targetNode) return s;

                const sourcePk = sourceNode.data.columns.find((c) => c.isPrimaryKey);
                const targetPk = targetNode.data.columns.find((c) => c.isPrimaryKey);
                if (!sourcePk || !targetPk) return s;

                const junctionId   = crypto.randomUUID();
                const fkSourceColId = crypto.randomUUID();
                const fkTargetColId = crypto.randomUUID();

                const junctionX = sourceNode.position.x + LAYOUT.JUNCTION_GAP;
                const junctionY = (sourceNode.position.y + targetNode.position.y) / 2;

                const junctionNode: TableNode = {
                    id: junctionId,
                    type: TABLE_NODE_TYPE,
                    position: { x: junctionX, y: junctionY },
                    data: {
                        id: junctionId,
                        name: `${sourceNode.data.name}_${targetNode.data.name}`,
                        columns: [
                            makePkCol(),
                            makeFkCol(fkSourceColId, `${sourceNode.data.name}_id`, sourceNodeId, sourcePk.id),
                            makeFkCol(fkTargetColId, `${targetNode.data.name}_id`, targetNodeId, targetPk.id),
                        ],
                    },
                };

                // T1 → junction (right source → left target)
                // T2 → junction (left  source → right target)  ⟹  T1 ─|──► junction ◄──|─ T2
                const edgeToSource = makeEdge(
                    sourceNodeId, junctionId,
                    `${sourcePk.id}-source`, `${fkSourceColId}-target`,
                    { sourceColumnId: sourcePk.id, targetColumnId: fkSourceColId, relationshipType: "one-to-many", autoCreatedColumnId: fkSourceColId, junctionTableId: junctionId },
                );
                const edgeToTarget = makeEdge(
                    targetNodeId, junctionId,
                    `${targetPk.id}-source-left`, `${fkTargetColId}-target-right`,
                    { sourceColumnId: targetPk.id, targetColumnId: fkTargetColId, relationshipType: "one-to-many", autoCreatedColumnId: fkTargetColId, junctionTableId: junctionId },
                );

                const updatedNodes = s.nodes.map((n) =>
                    n.id !== targetNodeId ? n
                        : { ...n, position: { x: junctionX + LAYOUT.JUNCTION_GAP, y: junctionY } },
                );

                return {
                    nodes: [...updatedNodes, junctionNode],
                    edges: [...s.edges, edgeToSource, edgeToTarget],
                };
            }),

        loadDiagram: (nodes: TableNode[], edges: RelationEdge[]) => set(() => ({ nodes, edges })),
    };
}
