import type { RelationshipType } from "./types/flow.types";

/** Padding applied when fitting the view to diagram content. */
export const FIT_VIEW_PADDING = 0.3;

/** Grid layout used when auto-placing new tables and running auto-layout. */
export const LAYOUT = {
    COLS: 4,
    GAP_X: 340,
    GAP_Y: 260,
    ORIGIN_X: 80,
    ORIGIN_Y: 80,
    /** Gap between T1, junction, and T2 when creating a M:N junction table. */
    JUNCTION_GAP: 350,
} as const;

/** Human-readable labels for relationship types (used in edge badges and dialogs). */
export const RELATION_LABELS: Record<RelationshipType, string> = {
    "one-to-one": "1 : 1",
    "one-to-many": "1 : N",
    "many-to-many": "N : M",
};

