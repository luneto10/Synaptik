import type { CSSProperties } from "react";
import { LAYOUT } from "../constants";

export const TABLE_NODE_LAYOUT = {
    HEADER_HEIGHT: 48,
    FOOTER_HEIGHT: 40,
    ROW_HEIGHT: 34,
    SEPARATOR_HEIGHT: 1,
    DOT_SIZE: 10,
    ROUTE_SIZE: 8,
} as const;

export function rowCenterY(index: number) {
    return (
        TABLE_NODE_LAYOUT.HEADER_HEIGHT +
        TABLE_NODE_LAYOUT.SEPARATOR_HEIGHT +
        index * TABLE_NODE_LAYOUT.ROW_HEIGHT +
        TABLE_NODE_LAYOUT.ROW_HEIGHT / 2
    );
}

export function computeTableMinHeight(requiredRows: number) {
    return Math.max(
        LAYOUT.MIN_NODE_HEIGHT,
        TABLE_NODE_LAYOUT.HEADER_HEIGHT +
            TABLE_NODE_LAYOUT.FOOTER_HEIGHT +
            TABLE_NODE_LAYOUT.SEPARATOR_HEIGHT +
            Math.max(1, requiredRows) * TABLE_NODE_LAYOUT.ROW_HEIGHT,
    );
}

export function visibleDotStyle(
    side: "left" | "right",
    showHandles: boolean,
): CSSProperties {
    return {
        width: TABLE_NODE_LAYOUT.DOT_SIZE,
        height: TABLE_NODE_LAYOUT.DOT_SIZE,
        borderRadius: "50%",
        background: "#fff",
        border: "2px solid #6366f1",
        opacity: showHandles ? 1 : 0,
        pointerEvents: showHandles ? "all" : "none",
        transition: "opacity 120ms",
        cursor: "crosshair",
        [side]: 0,
        transform: side === "left" ? "translateX(-50%)" : "translateX(50%)",
        boxShadow: "0 0 0 3px rgba(99,102,241,0.16)",
    };
}

export function invisibleTargetStyle(side: "left" | "right"): CSSProperties {
    return {
        width: 20,
        height: 20,
        opacity: 0,
        background: "transparent",
        border: "none",
        pointerEvents: "all",
        [side]: -10,
    };
}

export function routingHandleStyle(
    yCenter: number,
    side: "left" | "right",
): CSSProperties {
    return {
        width: TABLE_NODE_LAYOUT.ROUTE_SIZE,
        height: TABLE_NODE_LAYOUT.ROUTE_SIZE,
        opacity: 0,
        background: "transparent",
        border: "none",
        top: yCenter,
        [side]: 0,
        transform: side === "left" ? "translateX(-50%)" : "translateX(50%)",
        pointerEvents: "none",
    };
}

export function routingTargetStyle(
    yCenter: number,
    side: "left" | "right",
): CSSProperties {
    return {
        ...routingHandleStyle(yCenter, side),
        pointerEvents: "all",
    };
}
