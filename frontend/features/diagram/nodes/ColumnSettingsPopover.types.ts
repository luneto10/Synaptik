import type { DbColumn } from "../types/db.types";
import type { RelationEdge, TableNode } from "../types/flow.types";
import type { useDiagramStore } from "../store/diagramStore";

export type ColumnSettingsDialect =
    ReturnType<typeof useDiagramStore.getState>["dialect"];

export interface ColumnSettingsPopoverProps {
    nodeId: string;
    column: DbColumn;
    onUpdate: (column: DbColumn) => void;
}

export interface ColumnSettingsSnapshot {
    otherNodes: TableNode[];
    connectedEdge: RelationEdge | undefined;
    currentSide: "left" | "right" | null;
}
