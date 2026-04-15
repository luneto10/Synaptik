import type { Draft } from "immer";
import type { TableNode, RelationEdge } from "../types/flow.types";
import type { DiagramState } from "./diagramStore.types";
import { makeMnEdge, stripAutoCol } from "./helpers";

/** Shared cascade logic for removing a table and its edges (single immer draft mutation). */
export function removeTableAndCascadeInDraft(
    draft: Draft<DiagramState>,
    nodeId: string,
): void {
    for (const edge of draft.edges.filter((e) => e.source === nodeId)) {
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
}
