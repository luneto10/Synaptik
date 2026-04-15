"use client";

import { DIAGRAM_COLORS } from "../../constants";

function ArrowMarker({ id, orient }: { id: string; orient: string }) {
    return (
        <marker
            id={id}
            orient={orient}
            refX="8"
            refY="4"
            markerWidth="10"
            markerHeight="8"
        >
            <path d="M0,0 L0,8 L8,4 Z" fill={DIAGRAM_COLORS.edge} />
        </marker>
    );
}

function BarMarker({ id, orient }: { id: string; orient: string }) {
    return (
        <marker
            id={id}
            orient={orient}
            refX="2"
            refY="5"
            markerWidth="6"
            markerHeight="10"
        >
            <line
                x1="2"
                y1="0"
                x2="2"
                y2="10"
                stroke={DIAGRAM_COLORS.edge}
                strokeWidth="2"
            />
        </marker>
    );
}

export function EdgeMarkerDefs() {
    return (
        <svg
            style={{
                position: "absolute",
                width: 0,
                height: 0,
                overflow: "hidden",
            }}
        >
            <defs>
                <ArrowMarker id="me-arrow" orient="auto" />
                <ArrowMarker id="ms-arrow" orient="auto-start-reverse" />
                <BarMarker id="me-bar" orient="auto" />
                <BarMarker id="ms-bar" orient="auto-start-reverse" />
            </defs>
        </svg>
    );
}
