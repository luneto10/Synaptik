import type { RelationshipType } from "./types/flow.types";

export const HISTORY_LIMIT = 50;
/** Padding applied when fitting the view to diagram content. */
export const FIT_VIEW_PADDING = 0.3;

/** Delay (ms) before calling fitView / focus after a DOM reflow. */
export const REFLOW_DELAY_MS = 50;

/** Grid layout used when auto-placing new tables and running auto-layout. */
export const LAYOUT = {
    COLS: 4,
    GAP_X: 340,
    GAP_Y: 260,
    ORIGIN_X: 80,
    ORIGIN_Y: 80,
    /** Gap between T1, junction, and T2 when creating a M:N junction table. */
    JUNCTION_GAP: 350,
    /** Dagre graph layout spacing. */
    DAGRE_NODE_SEP: 100,
    DAGRE_RANK_SEP: 220,
    /** Default node dimensions used when measured size is unavailable. */
    DEFAULT_NODE_WIDTH: 280,
    DEFAULT_NODE_HEIGHT: 200,
    /** NodeResizer constraints. */
    MIN_NODE_WIDTH: 280,
    MIN_NODE_HEIGHT: 120,
} as const;

/** Diagram color palette (indigo-500 family). */
export const DIAGRAM_COLORS = {
    edge: "#6366f1",
    edgeSelected: "#818cf8",
    minimap: "#6366f1",
} as const;

/** Edge rendering constants. */
export const EDGE_STYLE = {
    borderRadius: 12,
    baseOffset: 36,
    laneStep: 24,
    obstacleStep: 32,
    obstacleYPadding: 40,
    strokeWidth: 1.8,
    strokeWidthSelected: 2.5,
} as const;

/** Human-readable labels for relationship types (used in edge badges and dialogs). */
export const RELATION_LABELS: Record<RelationshipType, string> = {
    "one-to-one": "1 : 1",
    "one-to-many": "1 : N",
    "many-to-many": "N : M",
};

/** Pixel offset applied to pasted nodes so they don't overlap their source. */
export const PASTE_OFFSET = 40;

/** Category box defaults. Resized freely, but clamped to MIN values. */
export const BOX = {
    /** Hex RGB (no alpha). Fill alpha comes from DEFAULT_OPACITY; border is always opaque. */
    DEFAULT_COLOR: "#6366f1",
    DEFAULT_OPACITY: 0.1,
    MIN_WIDTH: 160,
    MIN_HEIGHT: 120,
    /** Minimum drag distance (px) before drag-to-create commits a box. */
    CREATE_THRESHOLD: 24,
} as const;
