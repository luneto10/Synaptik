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
    makeMnEdge,
    stripAutoCol,
    defaultFkColumnName,
    singularizeTableName,
} from "./helpers";
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

        addTable: (name: string) =>
            set((draft) => {
                const id = crypto.randomUUID();
                const col = draft.nodes.length;
                const row = Math.floor(col / LAYOUT.COLS);
                draft.nodes.push({
                    id,
                    type: TABLE_NODE_TYPE,
                    position: {
                        x: LAYOUT.ORIGIN_X + (col % LAYOUT.COLS) * LAYOUT.GAP_X,
                        y: LAYOUT.ORIGIN_Y + row * LAYOUT.GAP_Y,
                    },
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
                for (const edge of draft.edges.filter(
                    (e) => e.source === nodeId,
                )) {
                    draft.nodes = stripAutoCol(
                        draft.nodes as TableNode[],
                        edge.data?.autoCreatedColumnId,
                        edge.data?.autoCreatedColumnNodeId ?? edge.target,
                    );
                }
                draft.nodes = draft.nodes.filter(
                    (n) => n.id !== nodeId,
                ) as TableNode[];

                const filteredEdges = draft.edges.filter(
                    (e) => e.source !== nodeId && e.target !== nodeId,
                );
                const junctionEdges = draft.edges.filter(
                    (e) => e.data?.junctionTableId === nodeId,
                );
                if (junctionEdges.length > 0) {
                    const mn = makeMnEdge(
                        draft.nodes as TableNode[],
                        junctionEdges as RelationEdge[],
                    );
                    draft.edges = mn ? [...filteredEdges, mn] : filteredEdges;
                } else {
                    draft.edges = filteredEdges;
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
                    if (
                        !sourceNode ||
                        !targetNode ||
                        !sourceColId ||
                        !targetColId
                    )
                        return e;
                    const sourceOnLeft =
                        sourceNode.position.x <= targetNode.position.x;
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
