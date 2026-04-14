import type { Node, Edge } from "@xyflow/react";
import type { DbTable } from "./db.types";

export type TableNodeData = DbTable & Record<string, unknown>;

export const TABLE_NODE_TYPE = "tableNode";

export type TableNode = Node<TableNodeData, typeof TABLE_NODE_TYPE>;

export type RelationshipType = "one-to-one" | "one-to-many" | "many-to-many";

export interface RelationEdgeData extends Record<string, unknown> {
    sourceColumnId: string;
    targetColumnId: string;
    relationshipType: RelationshipType;
    autoCreatedColumnId?: string;
    autoCreatedColumnNodeId?: string;
    junctionTableId?: string;
}

export type RelationEdge = Edge<RelationEdgeData>;
