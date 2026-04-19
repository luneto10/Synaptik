import type { Draft } from "immer";
import type { RelationEdge } from "../types/flow.types";
import type { DiagramState } from "./diagramStore.types";
import { makeMnEdge, stripAutoCol, tablesOf } from "./helpers";

/** Shared cascade logic for removing a table and its edges (single immer draft mutation). */
export function removeTableAndCascadeInDraft(
    draft: Draft<DiagramState>,
    nodeId: string,
): void {
    const tables = tablesOf(draft.nodes);

    for (const edge of draft.edges.filter((e) => e.source === nodeId)) {
        stripAutoCol(
            tables,
            edge.data?.autoCreatedColumnId,
            edge.data?.autoCreatedColumnNodeId ?? edge.target,
        );
    }
    draft.nodes = draft.nodes.filter((n) => n.id !== nodeId);

    const filteredEdges = draft.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
    );
    const junctionEdges = draft.edges.filter(
        (e) => e.data?.junctionTableId === nodeId,
    );
    if (junctionEdges.length > 0) {
        // Re-read tables since the cascading delete removed the junction node.
        const mn = makeMnEdge(
            tablesOf(draft.nodes),
            junctionEdges as RelationEdge[],
        );
        draft.edges = mn ? [...filteredEdges, mn] : filteredEdges;
    } else {
        draft.edges = filteredEdges;
    }
}
