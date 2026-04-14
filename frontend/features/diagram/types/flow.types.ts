import type { Node, Edge } from "@xyflow/react";
import { DbTable } from "./db.types";

export type TableNodeData = DbTable & Record<string, unknown>;

export const TABLE_NODE_TYPE = "tableNode";

export type TableNode = Node<TableNodeData, typeof TABLE_NODE_TYPE>;

export interface RelationEdgeData extends Record<string, unknown> {
    sourceColumnId: string;
    targetColumnId: string;
    relationshipType: "one-to-one" | "one-to-many" | "many-to-many";
}

export type RelationEdge = Edge<RelationEdgeData>;
