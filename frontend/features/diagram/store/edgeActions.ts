import { applyEdgeChanges, type Connection, type EdgeChange } from "@xyflow/react";
import type { RelationEdge, RelationshipType } from "../types/flow.types";
import type { TableNode } from "../types/flow.types";
import { makeEdge, makeFkCol, makeMnEdge, patchColumns, stripAutoCol, cascadeJunction, defaultFkColumnName, insertForeignKeyColumn } from "./helpers";
import type { SetState } from "./diagramStore.types";
import { handleIds, getHandleSide } from "../utils/handleIds";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns column-level source/target handle IDs based on relative node positions. */
function columnHandles(
    sourceColId: string,
    targetColId: string,
    sourceNodeId: string,
    targetNodeId: string,
    nodes: TableNode[],
) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const src = byId.get(sourceNodeId);
    const tgt = byId.get(targetNodeId);
    const sourceOnLeft = !src || !tgt || src.position.x <= tgt.position.x;
    return {
        sourceHandle: sourceOnLeft ? handleIds(sourceColId).sourceRight : handleIds(sourceColId).sourceLeft,
        targetHandle: sourceOnLeft ? handleIds(targetColId).targetLeft  : handleIds(targetColId).targetRight,
    };
}

const normalizeEdgeHandles = (nodes: TableNode[], edges: RelationEdge[]): RelationEdge[] => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((e) => {
        const sourceNode = byId.get(e.source);
        const targetNode = byId.get(e.target);
        const sourceColId = e.data?.sourceColumnId;
        const targetColId = e.data?.targetColumnId;
        if (!sourceNode || !targetNode || !sourceColId || !targetColId) return e;
        const sourceOnLeft = sourceNode.position.x <= targetNode.position.x;
        return {
            ...e,
            sourceHandle: sourceOnLeft ? handleIds(sourceColId).sourceRight : handleIds(sourceColId).sourceLeft,
            targetHandle: sourceOnLeft ? handleIds(targetColId).targetLeft  : handleIds(targetColId).targetRight,
        };
    });
};

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

                let nodes = draft.nodes as TableNode[];
                const extraRemovals: string[] = [];
                const newEdges: RelationEdge[] = [];
                const handledJunctions = new Set<string>();

                for (const id of removeIds) {
                    const edge = draft.edges.find((e) => e.id === id);
                    if (!edge) continue;

                    nodes = stripAutoCol(nodes, edge.data?.autoCreatedColumnId, edge.data?.autoCreatedColumnNodeId ?? edge.target);

                    const jId = edge.data?.junctionTableId;
                    if (!jId || handledJunctions.has(jId)) continue;
                    handledJunctions.add(jId);

                    const junctionEdges = draft.edges.filter((e) => e.data?.junctionTableId === jId) as RelationEdge[];
                    const allBeingRemoved = junctionEdges.every((e) => removeIds.has(e.id));

                    if (allBeingRemoved) {
                        const mn = makeMnEdge(nodes, junctionEdges);
                        if (mn) newEdges.push(mn);
                    } else {
                        const { nodes: n, extraRemovals: extra, newEdge } =
                            cascadeJunction(nodes, draft.edges as RelationEdge[], jId, new Set([id]));
                        nodes = n;
                        extraRemovals.push(...extra);
                        if (newEdge) newEdges.push(newEdge);
                    }
                }

                const allChanges = extraRemovals.length > 0
                    ? [...changes, ...extraRemovals.map((id) => ({ type: "remove" as const, id }))]
                    : changes;

                draft.nodes = nodes;
                draft.edges = [...(applyEdgeChanges(allChanges, draft.edges) as RelationEdge[]), ...newEdges];
            }),

        addEdgeWithType: (connection: Connection, fkName: string, type: RelationshipType) =>
            set((draft) => {
                const sourceNode = draft.nodes.find((n) => n.id === connection.source);
                const targetNode = draft.nodes.find((n) => n.id === connection.target);
                if (!sourceNode || !targetNode) return;

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
                    draft.nodes as TableNode[],
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

                let nodes = stripAutoCol(draft.nodes as TableNode[], edge.data?.autoCreatedColumnId, edge.data?.autoCreatedColumnNodeId ?? edge.target);
                let edges = draft.edges.filter((e) => e.id !== edgeId) as RelationEdge[];

                const jId = edge.data?.junctionTableId;
                if (jId) {
                    const { nodes: n, extraRemovals, newEdge } =
                        cascadeJunction(nodes, draft.edges as RelationEdge[], jId, new Set([edgeId]));
                    nodes = n;
                    edges = edges.filter((e) => !extraRemovals.includes(e.id));
                    if (newEdge) edges = [...edges, newEdge];
                }

                draft.nodes = nodes;
                draft.edges = edges;
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
                    const side = getHandleSide(e.sourceHandle, "source");
                    e.sourceHandle = side === "left" ? ch.sourceRight : ch.sourceLeft;
                } else {
                    const colId = e.data?.targetColumnId;
                    if (!colId) return;
                    const ch = handleIds(colId);
                    const side = getHandleSide(e.targetHandle, "target");
                    e.targetHandle = side === "right" ? ch.targetLeft : ch.targetRight;
                }
            }),

        retargetFkColumn: (nodeId: string, columnId: string, newRefTableId: string) =>
            set((draft) => {
                const newRefNode = draft.nodes.find((n) => n.id === newRefTableId);
                const newPk = newRefNode?.data.columns.find((c) => c.isPrimaryKey);
                if (!newRefNode || !newPk) return;

                // Search by column data ID (node-level handles don't encode column IDs)
                const oldEdge = draft.edges.find(
                    (e) => e.target === nodeId && e.data?.targetColumnId === columnId,
                );

                const nodes = patchColumns(draft.nodes as TableNode[], nodeId, (cols) =>
                    cols.map((c) => c.id !== columnId ? c : {
                        ...c,
                        name: defaultFkColumnName(newRefNode.data.name),
                        references: { tableId: newRefTableId, columnId: newPk.id },
                    }),
                );
                draft.nodes = nodes;

                const { sourceHandle, targetHandle } = columnHandles(
                    newPk.id, columnId,
                    newRefTableId, nodeId,
                    nodes,
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
                draft.edges = normalizeEdgeHandles(draft.nodes as TableNode[], draft.edges as RelationEdge[]);
            }),
    };
}
