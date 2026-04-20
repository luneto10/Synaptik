import type { Node, NodeChange } from "@xyflow/react";
import { BOX, LAYOUT } from "../constants";
import { BOX_NODE_TYPE } from "../types/flow.types";

const RESIZER_PADDING = 10;

export const SELECTION_RESIZER_HANDLE_SIZE = 16;

export type SelectionResizerCorner = "nw" | "ne" | "se" | "sw";

export interface SelectionResizerBBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface SelectionResizerNodeSnapshot {
    id: string;
    type: string | undefined;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface SelectionResizerDragState {
    corner: SelectionResizerCorner;
    startX: number;
    startY: number;
    bbox: SelectionResizerBBox;
    snapshots: SelectionResizerNodeSnapshot[];
    zoom: number;
    minScale: number;
    historyStarted: boolean;
}

export const SELECTION_RESIZER_CORNERS: {
    id: SelectionResizerCorner;
    cursor: string;
}[] = [
    { id: "nw", cursor: "nwse-resize" },
    { id: "ne", cursor: "nesw-resize" },
    { id: "se", cursor: "nwse-resize" },
    { id: "sw", cursor: "nesw-resize" },
];

export function computeBBox(nodes: Node[]): SelectionResizerBBox {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
        const width =
            node.measured?.width ?? node.width ?? LAYOUT.DEFAULT_NODE_WIDTH;
        const height =
            node.measured?.height ?? node.height ?? LAYOUT.DEFAULT_NODE_HEIGHT;
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + width);
        maxY = Math.max(maxY, node.position.y + height);
    }

    return { minX, minY, maxX, maxY };
}

export function applyScale(
    snapshot: SelectionResizerNodeSnapshot,
    anchorX: number,
    anchorY: number,
    scale: number,
): { position: { x: number; y: number }; width: number; height: number } {
    const minWidth =
        snapshot.type === BOX_NODE_TYPE ? BOX.MIN_WIDTH : LAYOUT.MIN_NODE_WIDTH;
    const minHeight =
        snapshot.type === BOX_NODE_TYPE
            ? BOX.MIN_HEIGHT
            : LAYOUT.MIN_NODE_HEIGHT;

    return {
        position: {
            x: anchorX + (snapshot.x - anchorX) * scale,
            y: anchorY + (snapshot.y - anchorY) * scale,
        },
        width: Math.max(snapshot.w * scale, minWidth),
        height: Math.max(snapshot.h * scale, minHeight),
    };
}

export function minAllowedScale(
    snapshots: SelectionResizerNodeSnapshot[],
): number {
    let minScale = 0.05;

    for (const snapshot of snapshots) {
        const minWidth =
            snapshot.type === BOX_NODE_TYPE
                ? BOX.MIN_WIDTH
                : LAYOUT.MIN_NODE_WIDTH;
        const minHeight =
            snapshot.type === BOX_NODE_TYPE
                ? BOX.MIN_HEIGHT
                : LAYOUT.MIN_NODE_HEIGHT;
        if (snapshot.w > 0) minScale = Math.max(minScale, minWidth / snapshot.w);
        if (snapshot.h > 0) {
            minScale = Math.max(minScale, minHeight / snapshot.h);
        }
    }

    return minScale;
}

export function computeScale(
    corner: SelectionResizerCorner,
    bbox: SelectionResizerBBox,
    dx: number,
    dy: number,
): { anchorX: number; anchorY: number; scale: number } {
    const origWidth = bbox.maxX - bbox.minX;
    const origHeight = bbox.maxY - bbox.minY;
    const origDistance = Math.sqrt(origWidth * origWidth + origHeight * origHeight);

    let anchorX: number;
    let anchorY: number;
    let vecX: number;
    let vecY: number;

    if (corner === "se") {
        anchorX = bbox.minX;
        anchorY = bbox.minY;
        vecX = origWidth + dx;
        vecY = origHeight + dy;
    } else if (corner === "nw") {
        anchorX = bbox.maxX;
        anchorY = bbox.maxY;
        vecX = origWidth - dx;
        vecY = origHeight - dy;
    } else if (corner === "ne") {
        anchorX = bbox.minX;
        anchorY = bbox.maxY;
        vecX = origWidth + dx;
        vecY = origHeight - dy;
    } else {
        anchorX = bbox.maxX;
        anchorY = bbox.minY;
        vecX = origWidth - dx;
        vecY = origHeight + dy;
    }

    const nextDistance = Math.sqrt(vecX * vecX + vecY * vecY);
    const scale = origDistance > 0 ? nextDistance / origDistance : 1;
    return { anchorX, anchorY, scale };
}

export function cornerFlowPos(
    corner: SelectionResizerCorner,
    bbox: SelectionResizerBBox,
) {
    const isLeft = corner === "nw" || corner === "sw";
    const isTop = corner === "nw" || corner === "ne";

    return {
        x: isLeft ? bbox.minX - RESIZER_PADDING : bbox.maxX + RESIZER_PADDING,
        y: isTop ? bbox.minY - RESIZER_PADDING : bbox.maxY + RESIZER_PADDING,
    };
}

export function createNodeSnapshots(nodes: Node[]): SelectionResizerNodeSnapshot[] {
    return nodes.map((node) => ({
        id: node.id,
        type: node.type,
        x: node.position.x,
        y: node.position.y,
        w: node.measured?.width ?? node.width ?? LAYOUT.DEFAULT_NODE_WIDTH,
        h: node.measured?.height ?? node.height ?? LAYOUT.DEFAULT_NODE_HEIGHT,
    }));
}

export function createDragState(
    corner: SelectionResizerCorner,
    bbox: SelectionResizerBBox,
    snapshots: SelectionResizerNodeSnapshot[],
    startX: number,
    startY: number,
    zoom: number,
): SelectionResizerDragState {
    return {
        corner,
        startX,
        startY,
        bbox,
        snapshots,
        zoom,
        minScale: minAllowedScale(snapshots),
        historyStarted: false,
    };
}

export function buildScaledNodeChanges(
    snapshots: SelectionResizerNodeSnapshot[],
    anchorX: number,
    anchorY: number,
    scale: number,
): NodeChange[] {
    return snapshots.flatMap((snapshot) => {
        const update = applyScale(snapshot, anchorX, anchorY, scale);

        return [
            { type: "position" as const, id: snapshot.id, position: update.position },
            {
                type: "dimensions" as const,
                id: snapshot.id,
                dimensions: { width: update.width, height: update.height },
                updateStyle: true,
                setAttributes: true,
            },
        ];
    });
}
