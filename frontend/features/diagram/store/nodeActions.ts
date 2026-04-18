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
import {
    hasDuplicateColumnName,
    hasDuplicateTableName,
    normalizeName,
} from "../utils/nameValidation";
import { findSpawnPosition } from "../utils/geometry";
import { normalizeEdgeHandles } from "../utils/handleNormalization";

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
                const trimmedName = name.trim();
                const finalName = trimmedName || "new_table";
                if (!normalizeName(finalName)) return;
                if (hasDuplicateTableName(draft.nodes as TableNode[], finalName))
                    return;

                const id = crypto.randomUUID();
                let pos: { x: number; y: number };
                if (position) {
                    // Offset slightly so the new table isn't exactly centred on the cursor
                    const desired = {
                        x: position.x - LAYOUT.DEFAULT_NODE_WIDTH / 2,
                        y: position.y - 60,
                    };
                    pos = findSpawnPosition(draft.nodes as TableNode[], desired);
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
                    data: { id, name: finalName, columns: [makePkCol()] },
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
                if (!normalizeName(column.name)) return;
                if (
                    hasDuplicateColumnName(
                        node.data.columns,
                        column.name,
                        column.id,
                    )
                )
                    return;
                const idx = node.data.columns.findIndex(
                    (c) => c.id === column.id,
                );
                if (idx !== -1) node.data.columns[idx] = column;
            }),

        removeColumn: (nodeId: string, columnId: string) =>
            set((draft) => {
                const node = draft.nodes.find((n) => n.id === nodeId);
                if (!node) return;

                // Deleting an FK column from a junction table drops the whole junction
                const col = node.data.columns.find((c) => c.id === columnId);
                const isJunction = draft.edges.some((e) => e.data?.junctionTableId === nodeId);
                if (isJunction && col?.isForeignKey) {
                    removeTableAndCascadeInDraft(draft, nodeId);
                    return;
                }

                node.data.columns = node.data.columns.filter(
                    (c) => c.id !== columnId,
                );
            }),

        renameTable: (nodeId: string, name: string) =>
            set((draft) => {
                const node = draft.nodes.find((n) => n.id === nodeId);
                if (!node) return;
                const trimmedName = name.trim();
                if (!normalizeName(trimmedName)) return;
                if (
                    hasDuplicateTableName(
                        draft.nodes as TableNode[],
                        trimmedName,
                        nodeId,
                    )
                )
                    return;
                node.data.name = trimmedName;
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
                        isJunction: true,
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
                draft.nodes = nodes;
                draft.edges = normalizeEdgeHandles(nodes, edges);
            }),
    };
}
