/**
 * Centralises ReactFlow handle ID construction and parsing.
 *
 * Handle naming is symmetric: `${colId}-{source|target}-{left|right}`.
 */

export const handleIds = (colId: string) => ({
    sourceRight: `${colId}-source-right`,
    sourceLeft: `${colId}-source-left`,
    targetLeft: `${colId}-target-left`,
    targetRight: `${colId}-target-right`,
});

export function sourceColumnIdFromHandle(
    handleId: string | null | undefined,
): string | undefined {
    if (!handleId) return undefined;
    return handleId.replace(/-source-(left|right)$/, "");
}

export function targetColumnIdFromHandle(
    handleId: string | null | undefined,
): string | undefined {
    if (!handleId) return undefined;
    return handleId.replace(/-target-(left|right)$/, "");
}

/** Derives the visual side ("left" | "right") from a handle ID string. */
export function getHandleSide(
    handleId: string | null | undefined,
    _type: "source" | "target",
): "left" | "right" {
    if (!handleId) return "right";
    return handleId.endsWith("-left") ? "left" : "right";
}
