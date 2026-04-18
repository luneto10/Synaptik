import { LAYOUT } from "../constants";
import type { TableNode } from "../types/flow.types";

const SPAWN_GAP_X = 32;
const SPAWN_GAP_Y = 28;
const SPAWN_SEARCH_STEPS = 18;

export function rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

function measuredSize(node: TableNode) {
    return {
        w: node.measured?.width ?? LAYOUT.DEFAULT_NODE_WIDTH,
        h: node.measured?.height ?? LAYOUT.DEFAULT_NODE_HEIGHT,
    };
}

/**
 * Finds a suitable spawn position for a new node that doesn't directly overlap
 * existing nodes, searching downward and to the right in steps.
 */
export function findSpawnPosition(
    nodes: TableNode[],
    desired: { x: number; y: number },
) {
    const newW = LAYOUT.DEFAULT_NODE_WIDTH;
    const newH = LAYOUT.DEFAULT_NODE_HEIGHT;

    const intersectsAny = (x: number, y: number) => {
        const candidate = { x, y, w: newW, h: newH };
        return nodes.some((n) => {
            const size = measuredSize(n);
            // Keep a small padding so "below" nodes don't appear stacked/covered.
            const box = {
                x: n.position.x - SPAWN_GAP_X / 2,
                y: n.position.y - SPAWN_GAP_Y / 2,
                w: size.w + SPAWN_GAP_X,
                h: size.h + SPAWN_GAP_Y,
            };
            return rectsOverlap(candidate, box);
        });
    };

    if (!intersectsAny(desired.x, desired.y)) return desired;

    for (let step = 1; step <= SPAWN_SEARCH_STEPS; step++) {
        const down = { x: desired.x, y: desired.y + step * SPAWN_GAP_Y };
        if (!intersectsAny(down.x, down.y)) return down;

        const right = { x: desired.x + step * SPAWN_GAP_X, y: desired.y };
        if (!intersectsAny(right.x, right.y)) return right;

        const diagonal = {
            x: desired.x + step * SPAWN_GAP_X,
            y: desired.y + step * SPAWN_GAP_Y,
        };
        if (!intersectsAny(diagonal.x, diagonal.y)) return diagonal;
    }

    // Last resort: preserve behavior and place at requested position.
    return desired;
}
