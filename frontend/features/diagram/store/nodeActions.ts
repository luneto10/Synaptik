import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import {
    TABLE_NODE_TYPE,
    type TableNode,
    type RelationEdge,
} from "../types/flow.types";
import { LAYOUT } from "../constants";
import {
    makePkCol,
    makeFkCol,
    makeEdge,
    defaultFkColumnName,
    singularizeTableName,
} from "./helpers";
import { removeTableAndCascadeInDraft } from "./tableDeletion";
import type { SetState } from "./diagramStore.types";
import { handleIds } from "../utils/handleIds";
import { DbColumn } from "../types/db.types";

export function createNodeActions(set: SetState) {
    return {
        onNodesChange: (changes: NodeChange[]) =>
            set((draft) => {
                draft.nodes = applyNodeChanges(
                    changes,
                    draft.nodes,
                ) as TableNode[];
            }),

        addTable: (name: string, position?: { x: number; y: number }) =>
            set((draft) => {
                const id = crypto.randomUUID();
                let pos: { x: number; y: number };
                if (position) {
                    // Offset slightly so the new table isn't exactly centred on the cursor
                    pos = { x: position.x - LAYOUT.DEFAULT_NODE_WIDTH / 2, y: position.y - 60 };
                } else {
                    const col = draft.nodes.length;
                    const row = Math.floor(col / LAYOUT.COLS);
                    pos = {
                        x: LAYOUT.ORIGIN_X + (col % LAYOUT.COLS) * LAYOUT.GAP_X,
                        y: LAYOUT.ORIGIN_Y + row * LAYOUT.GAP_Y,
                    };
                }
                draft.nodes.push({
                    id,
                    type: TABLE_NODE_TYPE,
                    position: pos,
                    data: { id, name, columns: [makePkCol()] },
                });
            }),

        addColumn: (nodeId: string, columnId?: string) =>
            set((draft) => {
                const node = draft.nodes.find((n) => n.id === nodeId);
                node?.data.columns.push({
                    id: columnId ?? crypto.randomUUID(),
                    name: "column_name",
                    type: "text",
                    isPrimaryKey: false,
                    isForeignKey: false,
                    isNullable: true,
                    isUnique: false,
                });
            }),

        updateColumn: (nodeId: string, column: DbColumn) =>
            set((draft) => {
                const node = draft.nodes.find((n) => n.id === nodeId);
                if (!node) return;
                const idx = node.data.columns.findIndex(
                    (c) => c.id === column.id,
                );
                if (idx !== -1) node.data.columns[idx] = column;
            }),

        removeColumn: (nodeId: string, columnId: string) =>
            set((draft) => {
                const node = draft.nodes.find((n) => n.id === nodeId);
                if (!node) return;
                node.data.columns = node.data.columns.filter(
                    (c) => c.id !== columnId,
                );
            }),

        renameTable: (nodeId: string, name: string) =>
            set((draft) => {
                const node = draft.nodes.find((n) => n.id === nodeId);
                if (node) node.data.name = name;
            }),

        deleteTable: (nodeId: string) =>
            set((draft) => {
                removeTableAndCascadeInDraft(draft, nodeId);
            }),

        /** One zundo step for React Flow keyboard delete (replaces applyNodeChanges(remove) + edge removes). */
        deleteTablesAtomic: (nodeIds: string[]) =>
            set((draft) => {
                const unique = [...new Set(nodeIds)];
                for (const id of unique) {
                    if (draft.nodes.some((n) => n.id === id)) {
                        removeTableAndCascadeInDraft(draft, id);
                    }
                }
            }),

        createJunctionTable: (sourceNodeId: string, targetNodeId: string) =>
            set((draft) => {
                const sourceNode = draft.nodes.find(
                    (n) => n.id === sourceNodeId,
                );
                const targetNode = draft.nodes.find(
                    (n) => n.id === targetNodeId,
                );
                if (!sourceNode || !targetNode) return;

                const sourcePk = sourceNode.data.columns.find(
                    (c) => c.isPrimaryKey,
                );
                const targetPk = targetNode.data.columns.find(
                    (c) => c.isPrimaryKey,
                );
                if (!sourcePk || !targetPk) return;

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
                        name: `${singularizeTableName(sourceNode.data.name)}_${singularizeTableName(targetNode.data.name)}`,
                        columns: [
                            makePkCol(),
                            makeFkCol(
                                fkSourceColId,
                                defaultFkColumnName(sourceNode.data.name),
                                sourceNodeId,
                                sourcePk.id,
                            ),
                            makeFkCol(
                                fkTargetColId,
                                defaultFkColumnName(targetNode.data.name),
                                targetNodeId,
                                targetPk.id,
                            ),
                        ],
                    },
                };

                // source is to the left of junction; target is to the right
                const edgeToSource = makeEdge(
                    sourceNodeId,
                    junctionId,
                    handleIds(sourcePk.id).sourceRight,
                    handleIds(fkSourceColId).targetLeft,
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
                    handleIds(targetPk.id).sourceLeft,
                    handleIds(fkTargetColId).targetRight,
                    {
                        sourceColumnId: targetPk.id,
                        targetColumnId: fkTargetColId,
                        relationshipType: "one-to-many",
                        autoCreatedColumnId: fkTargetColId,
                        junctionTableId: junctionId,
                    },
                );

                const tgt = draft.nodes.find((n) => n.id === targetNodeId);
                if (tgt)
                    tgt.position = {
                        x: junctionX + LAYOUT.JUNCTION_GAP,
                        y: junctionY,
                    };

                draft.nodes.push(junctionNode);
                draft.edges.push(edgeToSource, edgeToTarget);
            }),

        loadDiagram: (nodes: TableNode[], edges: RelationEdge[]) =>
            set((draft) => {
                const byId = new Map(nodes.map((n) => [n.id, n]));
                const normalizedEdges = edges.map((e) => {
                    const sourceNode = byId.get(e.source);
                    const targetNode = byId.get(e.target);
                    const sourceColId = e.data?.sourceColumnId;
                    const targetColId = e.data?.targetColumnId;
                    if (!sourceNode || !targetNode || !sourceColId || !targetColId) return e;
                    const sourceOnLeft = sourceNode.position.x <= targetNode.position.x;
                    return {
                        ...e,
                        sourceHandle: sourceOnLeft
                            ? handleIds(sourceColId).sourceRight
                            : handleIds(sourceColId).sourceLeft,
                        targetHandle: sourceOnLeft
                            ? handleIds(targetColId).targetLeft
                            : handleIds(targetColId).targetRight,
                    };
                });
                draft.nodes = nodes;
                draft.edges = normalizedEdges;
            }),
    };
}
