import { applyEdgeChanges, type Connection, type EdgeChange } from "@xyflow/react";
import type { RelationEdge, RelationshipType } from "../types/flow.types";
import type { TableNode } from "../types/flow.types";
import { makeEdge, makeFkCol, makeMnEdge, patchColumns, stripAutoCol, cascadeJunction } from "./helpers";
import type { SetState } from "./diagramStore.types";

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
                const edge = makeEdge(
                    connection.source!, connection.target!,
                    `${pkCol.id}-source`, `${fkColId}-target`,
                    { sourceColumnId: pkCol.id, targetColumnId: fkColId, relationshipType: type, autoCreatedColumnId: fkColId },
                );

                targetNode.data.columns.push(fkCol);
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

        flipColumnHandleSide: (nodeId: string, columnId: string) =>
            set((draft) => {
                for (const e of draft.edges) {
                    if (e.source === nodeId) {
                        const sh = e.sourceHandle ?? "";
                        if (sh === `${columnId}-source`)      e.sourceHandle = `${columnId}-source-left`;
                        else if (sh === `${columnId}-source-left`) e.sourceHandle = `${columnId}-source`;
                    }
                    if (e.target === nodeId) {
                        const th = e.targetHandle ?? "";
                        if (th === `${columnId}-target`)       e.targetHandle = `${columnId}-target-right`;
                        else if (th === `${columnId}-target-right`) e.targetHandle = `${columnId}-target`;
                    }
                }
            }),

        flipEdgeEnd: (edgeId: string, end: "source" | "target") =>
            set((draft) => {
                const e = draft.edges.find((e) => e.id === edgeId);
                if (!e) return;
                if (end === "source") {
                    const sh = e.sourceHandle ?? "";
                    e.sourceHandle = sh.endsWith("-source-left")
                        ? sh.replace("-source-left", "-source")
                        : sh.replace("-source", "-source-left");
                } else {
                    const th = e.targetHandle ?? "";
                    e.targetHandle = th.endsWith("-target-right")
                        ? th.replace("-target-right", "-target")
                        : th.replace("-target", "-target-right");
                }
            }),

        retargetFkColumn: (nodeId: string, columnId: string, newRefTableId: string) =>
            set((draft) => {
                const newRefNode = draft.nodes.find((n) => n.id === newRefTableId);
                const newPk = newRefNode?.data.columns.find((c) => c.isPrimaryKey);
                if (!newRefNode || !newPk) return;

                const oldEdge = draft.edges.find(
                    (e) => e.target === nodeId &&
                        (e.targetHandle === `${columnId}-target` || e.targetHandle === `${columnId}-target-right`),
                );

                // Update the column in-place
                const nodes = patchColumns(draft.nodes as TableNode[], nodeId, (cols) =>
                    cols.map((c) => c.id !== columnId ? c : {
                        ...c,
                        name: `${newRefNode.data.name.toLowerCase()}_id`,
                        references: { tableId: newRefTableId, columnId: newPk.id },
                    }),
                );
                draft.nodes = nodes;

                const targetHandle = oldEdge?.targetHandle ?? `${columnId}-target`;
                const newEdge = makeEdge(
                    newRefTableId, nodeId,
                    `${newPk.id}-source`, targetHandle,
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
    };
}
