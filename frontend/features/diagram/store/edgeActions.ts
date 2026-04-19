import { applyEdgeChanges, type Connection, type EdgeChange } from "@xyflow/react";
import type { Draft } from "immer";
import type {
    DiagramNode,
    RelationEdge,
    RelationshipType,
    TableNode,
} from "../types/flow.types";
import { isTableNode } from "../types/flow.types";
import {
    makeEdge,
    makeFkCol,
    makeMnEdge,
    patchColumns,
    stripAutoCol,
    cascadeJunction,
    defaultFkColumnName,
    insertForeignKeyColumn,
} from "./helpers";
import type { DiagramState, SetState } from "./diagramStore.types";
import { handleIds, getHandleSide } from "../utils/handleIds";
import { columnHandles, normalizeEdgeHandles } from "../utils/handleNormalization";

/** Table-only view of the current draft nodes. Helpers don't understand boxes. */
const tablesOf = (nodes: DiagramNode[]): TableNode[] => nodes.filter(isTableNode);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Apply edge removals with junction cascade: strip auto-created FK columns,
 * collapse/cascade junction tables, and queue any additional edges that need
 * removal. Mutates the draft in place.
 */
function applyEdgeRemovals(
    draft: Draft<DiagramState>,
    changes: EdgeChange[],
    removeIds: Set<string>,
) {
    const extraRemovals: string[] = [];
    const newEdges: RelationEdge[] = [];
    const handledJunctions = new Set<string>();

    for (const id of removeIds) {
        const edge = draft.edges.find((e) => e.id === id);
        if (!edge) continue;

        stripAutoCol(
            tablesOf(draft.nodes),
            edge.data?.autoCreatedColumnId,
            edge.data?.autoCreatedColumnNodeId ?? edge.target,
        );

        const jId = edge.data?.junctionTableId;
        if (!jId || handledJunctions.has(jId)) continue;
        handledJunctions.add(jId);

        const junctionEdges = draft.edges.filter(
            (e) => e.data?.junctionTableId === jId,
        ) as RelationEdge[];
        const allBeingRemoved = junctionEdges.every((e) => removeIds.has(e.id));

        if (allBeingRemoved) {
            const mn = makeMnEdge(tablesOf(draft.nodes), junctionEdges);
            if (mn) newEdges.push(mn);
        } else {
            const { extraRemovals: extra, newEdge } = cascadeJunction(
                tablesOf(draft.nodes),
                draft.edges as RelationEdge[],
                jId,
                new Set([id]),
            );
            extraRemovals.push(...extra);
            if (newEdge) newEdges.push(newEdge);
        }
    }

    const allChanges =
        extraRemovals.length > 0
            ? [...changes, ...extraRemovals.map((id) => ({ type: "remove" as const, id }))]
            : changes;

    draft.edges = [
        ...(applyEdgeChanges(allChanges, draft.edges) as RelationEdge[]),
        ...newEdges,
    ];
}

// ── Actions ───────────────────────────────────────────────────────────────────

export function createEdgeActions(set: SetState) {
    return {
        onEdgesChange: (changes: EdgeChange[]) =>
            set((draft) => {
                const removeIds = new Set(
                    changes.filter((c) => c.type === "remove").map((c) => c.id),
                );
                if (removeIds.size === 0) {
                    draft.edges = applyEdgeChanges(changes, draft.edges) as RelationEdge[];
                    return;
                }
                applyEdgeRemovals(draft, changes, removeIds);
            }),

        addEdgeWithType: (connection: Connection, fkName: string, type: RelationshipType) =>
            set((draft) => {
                const sourceNode = draft.nodes.find((n) => n.id === connection.source);
                const targetNode = draft.nodes.find((n) => n.id === connection.target);
                if (!sourceNode || !isTableNode(sourceNode)) return;
                if (!targetNode || !isTableNode(targetNode)) return;

                const pkCol = sourceNode.data.columns.find((c) => c.isPrimaryKey);
                if (!pkCol) return;

                let resolvedName = fkName;
                let counter = 2;
                while (targetNode.data.columns.some((c) => c.name === resolvedName)) {
                    resolvedName = `${fkName}_${counter++}`;
                }

                const fkColId = crypto.randomUUID();
                const fkCol = makeFkCol(fkColId, resolvedName, connection.source!, pkCol.id, type === "one-to-one");

                const { sourceHandle, targetHandle } = columnHandles(
                    pkCol.id, fkColId,
                    connection.source!, connection.target!,
                    tablesOf(draft.nodes),
                );
                const edge = makeEdge(
                    connection.source!, connection.target!,
                    sourceHandle, targetHandle,
                    { sourceColumnId: pkCol.id, targetColumnId: fkColId, relationshipType: type, autoCreatedColumnId: fkColId },
                );

                targetNode.data.columns = insertForeignKeyColumn(targetNode.data.columns, fkCol);
                draft.edges.push(edge);
            }),

        setEdgeRelationType: (edgeId: string, type: RelationshipType) =>
            set((draft) => {
                const edge = draft.edges.find((e) => e.id === edgeId);
                if (edge?.data) edge.data.relationshipType = type;
            }),

        deleteEdge: (edgeId: string) =>
            set((draft) => {
                const edge = draft.edges.find((e) => e.id === edgeId);
                if (!edge) return;

                stripAutoCol(tablesOf(draft.nodes), edge.data?.autoCreatedColumnId, edge.data?.autoCreatedColumnNodeId ?? edge.target);
                draft.edges = draft.edges.filter((e) => e.id !== edgeId) as RelationEdge[];
            }),

        deleteEdgeOnly: (edgeId: string) =>
            set((draft) => {
                draft.edges = draft.edges.filter((e) => e.id !== edgeId);
            }),

        flipColumnHandleSide: (nodeId: string, columnId: string) =>
            set((draft) => {
                const ch = handleIds(columnId);
                for (const e of draft.edges) {
                    const isSourceCol = e.source === nodeId && e.data?.sourceColumnId === columnId;
                    const isTargetCol = e.target === nodeId && e.data?.targetColumnId === columnId;
                    if (isSourceCol) {
                        e.sourceHandle = e.sourceHandle === ch.sourceRight ? ch.sourceLeft : ch.sourceRight;
                    }
                    if (isTargetCol) {
                        e.targetHandle = e.targetHandle === ch.targetLeft ? ch.targetRight : ch.targetLeft;
                    }
                }
            }),

        flipEdgeEnd: (edgeId: string, end: "source" | "target") =>
            set((draft) => {
                const e = draft.edges.find((e) => e.id === edgeId);
                if (!e) return;
                if (end === "source") {
                    const colId = e.data?.sourceColumnId;
                    if (!colId) return;
                    const ch = handleIds(colId);
                    const side = getHandleSide(e.sourceHandle);
                    e.sourceHandle = side === "left" ? ch.sourceRight : ch.sourceLeft;
                } else {
                    const colId = e.data?.targetColumnId;
                    if (!colId) return;
                    const ch = handleIds(colId);
                    const side = getHandleSide(e.targetHandle);
                    e.targetHandle = side === "right" ? ch.targetLeft : ch.targetRight;
                }
            }),

        retargetFkColumn: (nodeId: string, columnId: string, newRefTableId: string) =>
            set((draft) => {
                const newRefNode = draft.nodes.find((n) => n.id === newRefTableId);
                if (!newRefNode || !isTableNode(newRefNode)) return;
                const newPk = newRefNode.data.columns.find((c) => c.isPrimaryKey);
                if (!newPk) return;

                // Search by column data ID (node-level handles don't encode column IDs)
                const oldEdge = draft.edges.find(
                    (e) => e.target === nodeId && e.data?.targetColumnId === columnId,
                );

                patchColumns(tablesOf(draft.nodes), nodeId, (cols) =>
                    cols.map((c) => c.id !== columnId ? c : {
                        ...c,
                        name: defaultFkColumnName(newRefNode.data.name),
                        references: { tableId: newRefTableId, columnId: newPk.id },
                    }),
                );

                const { sourceHandle, targetHandle } = columnHandles(
                    newPk.id, columnId,
                    newRefTableId, nodeId,
                    tablesOf(draft.nodes),
                );
                const newEdge = makeEdge(
                    newRefTableId, nodeId,
                    sourceHandle, targetHandle,
                    {
                        sourceColumnId: newPk.id,
                        targetColumnId: columnId,
                        relationshipType: (oldEdge?.data?.relationshipType as RelationshipType) ?? "one-to-many",
                        autoCreatedColumnId: columnId,
                        autoCreatedColumnNodeId: nodeId,
                    },
                );

                if (oldEdge) draft.edges = draft.edges.filter((e) => e.id !== oldEdge.id) as RelationEdge[];
                draft.edges.push(newEdge);
            }),

        normalizeEdgeHandleDirections: () =>
            set((draft) => {
                draft.edges = normalizeEdgeHandles(tablesOf(draft.nodes), draft.edges as RelationEdge[]);
            }),
    };
}
