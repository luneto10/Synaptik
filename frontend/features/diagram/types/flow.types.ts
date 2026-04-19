import type { Node, Edge } from "@xyflow/react";
import type { DbTable } from "./db.types";

export type TableNodeData = DbTable & Record<string, unknown>;

export const TABLE_NODE_TYPE = "tableNode";

export type TableNode = Node<TableNodeData, typeof TABLE_NODE_TYPE>;

export const BOX_NODE_TYPE = "boxNode";

export interface BoxNodeData extends Record<string, unknown> {
    title: string;
    /** Hex RGB (no alpha), e.g. "#6366f1". Alpha is controlled via `opacity`. */
    color: string;
    /** Fill alpha in [0, 1]. Border always renders at full opacity. */
    opacity: number;
}

export type BoxNode = Node<BoxNodeData, typeof BOX_NODE_TYPE>;

export type DiagramNode = TableNode | BoxNode;

export const isTableNode = (n: DiagramNode): n is TableNode =>
    n.type === TABLE_NODE_TYPE;

export const isBoxNode = (n: DiagramNode): n is BoxNode =>
    n.type === BOX_NODE_TYPE;

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
