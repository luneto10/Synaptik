import type { RelationshipType } from "./types/flow.types";
import type { FitViewOptions } from "@xyflow/react";

export const HISTORY_LIMIT = 50;
/** Enable React Flow visible-element culling only for large diagrams. */
export const LARGE_DIAGRAM_NODE_THRESHOLD = 400;
/** Use progressive chunked loading for very large diagrams. */
export const BULK_LOAD_NODE_THRESHOLD = 500;
/** Initial node batch size for progressive loading. */
export const BULK_LOAD_CHUNK_SIZE_INITIAL = 120;
/** Min/max adaptive chunk bounds while loading. */
export const BULK_LOAD_CHUNK_SIZE_MIN = 60;
export const BULK_LOAD_CHUNK_SIZE_MAX = 320;
/** Target frame budget (ms) while progressively loading nodes. */
export const BULK_LOAD_FRAME_BUDGET_MS = 12;
/** Padding applied when fitting the view to diagram content. */
export const FIT_VIEW_PADDING = 0.3;

/** Delay (ms) before calling fitView / focus after a DOM reflow. */
export const REFLOW_DELAY_MS = 50;

export function scheduleFitView(
    fitView: (options?: FitViewOptions) => void | Promise<unknown>,
    options: FitViewOptions = { padding: FIT_VIEW_PADDING },
    delayMs = REFLOW_DELAY_MS,
    onDone?: () => void,
) {
    return window.setTimeout(() => {
        void fitView(options);
        onDone?.();
    }, delayMs);
}

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

/** Horizontal pixel offset applied to duplicated nodes so they appear beside the originals. */
export const DUPLICATE_OFFSET = 40;

/** Category box defaults. Resized freely, but clamped to MIN values. */
export const BOX = {
    DEFAULT_COLOR: "#6366f1",
    DEFAULT_OPACITY: 0.1,
    MIN_WIDTH: 160,
    MIN_HEIGHT: 120,
    /** Minimum drag distance (px) before drag-to-create commits a box. */
    CREATE_THRESHOLD: 24,
} as const;
