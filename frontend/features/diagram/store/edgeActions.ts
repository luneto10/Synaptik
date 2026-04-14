import { applyEdgeChanges, type Connection, type EdgeChange } from "@xyflow/react";
import type { RelationEdge, RelationshipType } from "../types/flow.types";
import { makeEdge, makeFkCol, makeMnEdge, patchColumns, stripAutoCol, cascadeJunction } from "./helpers";
import type { SetState } from "./diagramStore.types";

export function createEdgeActions(set: SetState) {
    return {
        onEdgesChange: (changes: EdgeChange[]) =>
            set((s) => {
                const removeIds = new Set(
                    changes.filter((c) => c.type === "remove").map((c) => c.id),
                );
                if (removeIds.size === 0) {
                    return { edges: applyEdgeChanges(changes, s.edges) as RelationEdge[] };
                }

                let nodes = s.nodes;
                const extraRemovals: string[] = [];
                const newEdges: RelationEdge[] = [];
                const handledJunctions = new Set<string>();

                for (const id of removeIds) {
                    const edge = s.edges.find((e) => e.id === id);
                    if (!edge) continue;

                    nodes = stripAutoCol(
                        nodes,
                        edge.data?.autoCreatedColumnId,
                        edge.data?.autoCreatedColumnNodeId ?? edge.target,
                    );

                    const jId = edge.data?.junctionTableId;
                    if (!jId || handledJunctions.has(jId)) continue;
                    handledJunctions.add(jId);

                    const junctionEdges = s.edges.filter((e) => e.data?.junctionTableId === jId);
                    const allBeingRemoved = junctionEdges.every((e) => removeIds.has(e.id));

                    if (allBeingRemoved) {
                        const mn = makeMnEdge(s.nodes, junctionEdges);
                        if (mn) newEdges.push(mn);
                    } else {
                        const { nodes: n, extraRemovals: extra, newEdge } =
                            cascadeJunction(nodes, s.edges, jId, new Set([id]));
                        nodes = n;
                        extraRemovals.push(...extra);
                        if (newEdge) newEdges.push(newEdge);
                    }
                }

                const allChanges = extraRemovals.length > 0
                    ? [...changes, ...extraRemovals.map((id) => ({ type: "remove" as const, id }))]
                    : changes;

                return {
                    edges: [...(applyEdgeChanges(allChanges, s.edges) as RelationEdge[]), ...newEdges],
                    nodes,
                };
            }),

        addEdgeWithType: (connection: Connection, fkName: string, type: RelationshipType) =>
            set((s) => {
                const sourceNode = s.nodes.find((n) => n.id === connection.source);
                const targetNode = s.nodes.find((n) => n.id === connection.target);
                if (!sourceNode || !targetNode) return s;

                const pkCol = sourceNode.data.columns.find((c) => c.isPrimaryKey);
                if (!pkCol) return s;

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

                return {
                    edges: [...s.edges, edge],
                    nodes: patchColumns(s.nodes, connection.target!, (cols) => [...cols, fkCol]),
                };
            }),

        setEdgeRelationType: (edgeId: string, type: RelationshipType) =>
            set((s) => ({
                edges: s.edges.map((e) =>
                    e.id !== edgeId ? e : { ...e, data: { ...e.data!, relationshipType: type } },
                ),
            })),

        deleteEdge: (edgeId: string) =>
            set((s) => {
                const edge = s.edges.find((e) => e.id === edgeId);
                if (!edge) return s;

                let nodes = stripAutoCol(s.nodes, edge.data?.autoCreatedColumnId, edge.data?.autoCreatedColumnNodeId ?? edge.target);
                let edges = s.edges.filter((e) => e.id !== edgeId);

                const jId = edge.data?.junctionTableId;
                if (jId) {
                    const { nodes: n, extraRemovals, newEdge } =
                        cascadeJunction(nodes, s.edges, jId, new Set([edgeId]));
                    nodes = n;
                    edges = edges.filter((e) => !extraRemovals.includes(e.id));
                    if (newEdge) edges = [...edges, newEdge];
                }

                return { edges, nodes };
            }),

        flipColumnHandleSide: (nodeId: string, columnId: string) =>
            set((s) => ({
                edges: s.edges.map((e) => {
                    if (e.source === nodeId) {
                        const sh = e.sourceHandle ?? "";
                        if (sh === `${columnId}-source`)      return { ...e, sourceHandle: `${columnId}-source-left` };
                        if (sh === `${columnId}-source-left`) return { ...e, sourceHandle: `${columnId}-source` };
                    }
                    if (e.target === nodeId) {
                        const th = e.targetHandle ?? "";
                        if (th === `${columnId}-target`)       return { ...e, targetHandle: `${columnId}-target-right` };
                        if (th === `${columnId}-target-right`) return { ...e, targetHandle: `${columnId}-target` };
                    }
                    return e;
                }),
            })),

        flipEdgeEnd: (edgeId: string, end: "source" | "target") =>
            set((s) => ({
                edges: s.edges.map((e) => {
                    if (e.id !== edgeId) return e;
                    if (end === "source") {
                        const sh = e.sourceHandle ?? "";
                        return { ...e, sourceHandle: sh.endsWith("-source-left")
                            ? sh.replace("-source-left", "-source")
                            : sh.replace("-source", "-source-left") };
                    }
                    const th = e.targetHandle ?? "";
                    return { ...e, targetHandle: th.endsWith("-target-right")
                        ? th.replace("-target-right", "-target")
                        : th.replace("-target", "-target-right") };
                }),
            })),

        retargetFkColumn: (nodeId: string, columnId: string, newRefTableId: string) =>
            set((s) => {
                const newRefNode = s.nodes.find((n) => n.id === newRefTableId);
                const newPk = newRefNode?.data.columns.find((c) => c.isPrimaryKey);
                if (!newRefNode || !newPk) return s;

                const oldEdge = s.edges.find(
                    (e) => e.target === nodeId &&
                        (e.targetHandle === `${columnId}-target` || e.targetHandle === `${columnId}-target-right`),
                );

                const nodes = patchColumns(s.nodes, nodeId, (cols) =>
                    cols.map((c) => c.id !== columnId ? c : {
                        ...c,
                        name: `${newRefNode.data.name.toLowerCase()}_id`,
                        references: { tableId: newRefTableId, columnId: newPk.id },
                    }),
                );

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

                const edges = [
                    ...(oldEdge ? s.edges.filter((e) => e.id !== oldEdge.id) : s.edges),
                    newEdge,
                ];

                return { nodes, edges };
            }),
    };
}
