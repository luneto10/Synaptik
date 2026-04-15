import type { EdgeTypes } from "@xyflow/react";
import type { RelationshipType } from "./types/flow.types";
import RelationEdgeComponent from "./components/edges/RelationEdge";
import { FIT_VIEW_PADDING, DIAGRAM_COLORS } from "./constants";

export const edgeTypes: EdgeTypes = {
    relation: RelationEdgeComponent as EdgeTypes[string],
};

export const CONNECTION_LINE_STYLE = {
    stroke: DIAGRAM_COLORS.edge,
    strokeWidth: 2,
};

export const FIT_VIEW_OPTIONS = { padding: FIT_VIEW_PADDING };

export const DEFAULT_EDGE_OPTIONS = {
    type: "relation",
    data: {
        relationshipType: "one-to-many" as RelationshipType,
        sourceColumnId: "",
        targetColumnId: "",
    },
};
