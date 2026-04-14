/**
 * Centralises ReactFlow handle ID construction and parsing so that
 * every file that wires connections or reads handle IDs uses the same strings.
 *
 * Handle conventions:
 *   source-right  →  `${colId}-source`
 *   source-left   →  `${colId}-source-left`
 *   target-left   →  `${colId}-target`
 *   target-right  →  `${colId}-target-right`
 */

export const handleIds = (colId: string) => ({
    sourceRight: `${colId}-source`,
    sourceLeft:  `${colId}-source-left`,
    targetLeft:  `${colId}-target`,
    targetRight: `${colId}-target-right`,
});

export function sourceColumnIdFromHandle(handleId: string | null | undefined): string | undefined {
    if (!handleId) return undefined;
    return handleId.replace(/-source(-left)?$/, "");
}

export function targetColumnIdFromHandle(handleId: string | null | undefined): string | undefined {
    if (!handleId) return undefined;
    return handleId.replace(/-target(-right)?$/, "");
}

/** Derives the visual side ("left" | "right") from a handle ID string. */
export function getHandleSide(
    handleId: string | null | undefined,
    type: "source" | "target",
): "left" | "right" {
    if (!handleId) return "right";
    return type === "source"
        ? handleId.endsWith("-source-left") ? "left" : "right"
        : handleId.endsWith("-target-right") ? "right" : "left";
}
