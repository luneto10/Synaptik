import type { Connection, EdgeChange, NodeChange } from "@xyflow/react";
import type {
    DiagramNode,
    RelationEdge,
    RelationshipType,
} from "../types/flow.types";
import type { DbColumn } from "../types/db.types";

export interface DiagramState {
    nodes: DiagramNode[];
    edges: RelationEdge[];
    selectedCount: number;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    /**
     * Creates an edge between two tables, auto-creating a FK column
     * in the target table pointing at the source table's PK.
     */
    addEdgeWithType: (
        connection: Connection,
        fkName: string,
        type: RelationshipType,
    ) => void;
    setEdgeRelationType: (edgeId: string, type: RelationshipType) => void;
    /** Deletes the edge and removes the auto-created FK column from its node. */
    deleteEdge: (edgeId: string) => void;
    /** Deletes only the edge row — no FK column cascade. */
    deleteEdgeOnly: (edgeId: string) => void;
    addTable: (name: string, position?: { x: number; y: number }) => void;
    /** Creates a category box at the given position/size. */
    addBox: (
        position: { x: number; y: number },
        size: { width: number; height: number },
        color?: string,
        opacity?: number,
    ) => void;
    /** Patches title/color/opacity on a category box. Ignored if the id is not a box. */
    updateBox: (
        nodeId: string,
        patch: Partial<{ title: string; color: string; opacity: number }>,
    ) => void;
    updateColumn: (nodeId: string, column: DbColumn) => void;
    addColumn: (nodeId: string, columnId?: string) => void;
    removeColumn: (nodeId: string, columnId: string) => void;
    renameTable: (nodeId: string, name: string) => void;
    deleteTable: (nodeId: string) => void;
    /** Deletes one or more tables in a single immer transaction (one undo step) — for React Flow batch delete. */
    deleteTablesAtomic: (nodeIds: string[]) => void;
    /** Creates a junction table for M:N and wires it with 1:N edges to both parent tables. */
    createJunctionTable: (sourceNodeId: string, targetNodeId: string) => void;
    /** Replaces the entire diagram state — used for loading saved or mock data. */
    loadDiagram: (nodes: DiagramNode[], edges: RelationEdge[]) => void;
    /** Incrementally loads large diagrams in frame-sized chunks. */
    loadDiagramChunked: (nodes: DiagramNode[], edges: RelationEdge[]) => Promise<void>;
    /** Chooses sync or chunked loading based on diagram size. */
    loadDiagramAdaptive: (nodes: DiagramNode[], edges: RelationEdge[]) => Promise<void>;
    /** Snapshots the currently selected nodes (and edges between them) into the clipboard. No-op when nothing is selected. */
    copySelection: () => void;
    /**
     * Duplicates the currently selected nodes (and edges between them) in place,
     * offsetting clones to the right. Single undo step. No-op when nothing is selected.
     */
    duplicateSelection: () => void;
    /**
     * Pastes the clipboard contents as new nodes/edges with fresh ids and unique names.
     * When `anchor` is provided (flow coords), the top-left of the clipboard's bounding
     * box lands at that point; otherwise a constant diagonal offset is applied.
     * Single undo step.
     */
    pasteClipboard: (anchor?: { x: number; y: number }) => void;
    /** Toggles the handle side (left ↔ right) for all edges connected to a specific column. */
    flipColumnHandleSide: (nodeId: string, columnId: string) => void;
    /** Toggles the source or target handle of a single edge between left and right. */
    flipEdgeEnd: (edgeId: string, end: "source" | "target") => void;
    /**
     * Re-targets a FK column to a different reference table:
     * renames the column to {newTable}_id, updates its references,
     * and swaps the connecting edge to start from the new table's PK.
     */
    retargetFkColumn: (
        nodeId: string,
        columnId: string,
        newRefTableId: string,
    ) => void;
    /** Recomputes edge handle sides from current node positions (left/right flow). */
    normalizeEdgeHandleDirections: () => void;
}

/** Zustand setter typed for immer middleware (mutate draft directly). */
export type SetState = (recipe: (draft: DiagramState) => void) => void;
