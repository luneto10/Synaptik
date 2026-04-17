import type { RelationEdge } from "../../types/flow.types";
import { LAYOUT } from "../../constants";
import {
    AUTO_LAYOUT,
    boundsFor,
    centerX,
    centerY,
    overlap1D,
    translate,
    type LayoutPositions,
} from "./shared";

/**
 * Arrange disconnected components on the canvas.
 * Sort largest-first, then place into rows whose width targets a roughly
 * 16:10 aspect ratio — produces a balanced grid instead of a single
 * ever-growing horizontal strip.
 */
export function packComponents(
    components: Array<{ nodeIds: string[]; edges: RelationEdge[] }>,
    positions: LayoutPositions,
) {
    if (components.length <= 1) return;

    const sorted = [...components].sort(
        (a, b) =>
            b.nodeIds.length - a.nodeIds.length ||
            b.edges.length - a.edges.length,
    );
    const bounds = sorted.map((c) => boundsFor(c.nodeIds, positions));

    const totalArea = bounds.reduce(
        (acc, b) =>
            acc +
            (b.width + AUTO_LAYOUT.componentGapX) *
                (b.height + AUTO_LAYOUT.componentGapY),
        0,
    );
    const targetWidth = Math.sqrt(totalArea * 1.6);

    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;

    sorted.forEach((component, index) => {
        const b = bounds[index];
        if (index > 0 && cursorX + b.width > targetWidth) {
            cursorX = 0;
            cursorY += rowHeight + AUTO_LAYOUT.componentGapY;
            rowHeight = 0;
        }
        translate(component.nodeIds, positions, cursorX - b.minX, cursorY - b.minY);
        cursorX += b.width + AUTO_LAYOUT.componentGapX;
        rowHeight = Math.max(rowHeight, b.height);
    });
}

/**
 * Balance hubs with many exclusive left-side leaf sources by moving the bottom
 * half to the right side — creates a symmetric fan-in / fan-out look.
 */
export function balanceHeavyFanIn(
    positions: LayoutPositions,
    edges: RelationEdge[],
) {
    const THRESHOLD = 3;
    const GAP = LAYOUT.DAGRE_NODE_SEP;

    const sourceTargetCount = new Map<string, number>();
    for (const e of edges) {
        sourceTargetCount.set(
            e.source,
            (sourceTargetCount.get(e.source) ?? 0) + 1,
        );
    }

    const sourcesByTarget = new Map<string, Set<string>>();
    for (const e of edges) {
        if (!sourcesByTarget.has(e.target))
            sourcesByTarget.set(e.target, new Set());
        sourcesByTarget.get(e.target)?.add(e.source);
    }

    for (const [targetId, sourcesSet] of sourcesByTarget) {
        const targetPos = positions.get(targetId);
        if (!targetPos) continue;

        const leftExclusive = [...sourcesSet].filter((sid) => {
            const sPos = positions.get(sid);
            if (!sPos) return false;
            if (sPos.x >= targetPos.x) return false;
            return (sourceTargetCount.get(sid) ?? 0) === 1;
        });

        if (leftExclusive.length <= THRESHOLD) continue;

        leftExclusive.sort(
            (a, b) => (positions.get(a)?.y ?? 0) - (positions.get(b)?.y ?? 0),
        );

        const splitAt = Math.ceil(leftExclusive.length / 2);
        const toMoveRight = leftExclusive.slice(splitAt);

        const rightX = targetPos.x + targetPos.w + AUTO_LAYOUT.componentGapX / 2;
        const totalH = toMoveRight.reduce(
            (acc, id) => acc + (positions.get(id)?.h ?? 0) + GAP,
            -GAP,
        );
        let y = targetPos.y + targetPos.h / 2 - totalH / 2;

        for (const sid of toMoveRight) {
            const sPos = positions.get(sid);
            if (!sPos) continue;
            positions.set(sid, { ...sPos, x: rightX, y });
            y += sPos.h + GAP;
        }
    }
}

/**
 * Safety-net pass — push apart any overlap that component packing introduced.
 * ELK already guarantees non-overlap within a component.
 */
export function resolveNodeOverlaps(positions: LayoutPositions) {
    const ids = [...positions.keys()];
    for (let iter = 0; iter < AUTO_LAYOUT.overlapIterations; iter++) {
        let changed = false;
        for (let i = 0; i < ids.length; i++) {
            const aId = ids[i];
            const a = positions.get(aId);
            if (!a) continue;
            for (let j = i + 1; j < ids.length; j++) {
                const bId = ids[j];
                const b = positions.get(bId);
                if (!b) continue;

                const ox = overlap1D(
                    a.x - AUTO_LAYOUT.minColumnGap / 2,
                    a.x + a.w + AUTO_LAYOUT.minColumnGap / 2,
                    b.x - AUTO_LAYOUT.minColumnGap / 2,
                    b.x + b.w + AUTO_LAYOUT.minColumnGap / 2,
                );
                const oy = overlap1D(
                    a.y - AUTO_LAYOUT.minRowGap / 2,
                    a.y + a.h + AUTO_LAYOUT.minRowGap / 2,
                    b.y - AUTO_LAYOUT.minRowGap / 2,
                    b.y + b.h + AUTO_LAYOUT.minRowGap / 2,
                );

                if (ox <= 0 || oy <= 0) continue;

                changed = true;
                if (ox < oy) {
                    const push = ox / 2 + 1;
                    if (centerX(a) <= centerX(b)) {
                        positions.set(aId, { ...a, x: a.x - push });
                        positions.set(bId, { ...b, x: b.x + push });
                    } else {
                        positions.set(aId, { ...a, x: a.x + push });
                        positions.set(bId, { ...b, x: b.x - push });
                    }
                } else {
                    const push = oy / 2 + 1;
                    if (centerY(a) <= centerY(b)) {
                        positions.set(aId, { ...a, y: a.y - push });
                        positions.set(bId, { ...b, y: b.y + push });
                    } else {
                        positions.set(aId, { ...a, y: a.y + push });
                        positions.set(bId, { ...b, y: b.y - push });
                    }
                }
            }
        }
        if (!changed) break;
    }
}

export function normalizeCanvasOrigin(positions: LayoutPositions) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    for (const p of positions.values()) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

    const dx = AUTO_LAYOUT.topLeftPaddingX - minX;
    const dy = AUTO_LAYOUT.topLeftPaddingY - minY;
    for (const [id, p] of positions) {
        positions.set(id, { ...p, x: p.x + dx, y: p.y + dy });
    }
}
