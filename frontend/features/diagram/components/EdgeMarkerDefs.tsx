"use client";

export function EdgeMarkerDefs() {
    return (
        <svg
            style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        >
            <defs>
                <marker id="me-arrow" orient="auto" refX="8" refY="4" markerWidth="10" markerHeight="8">
                    <path d="M0,0 L0,8 L8,4 Z" fill="#6366f1" />
                </marker>
                <marker id="ms-arrow" orient="auto-start-reverse" refX="8" refY="4" markerWidth="10" markerHeight="8">
                    <path d="M0,0 L0,8 L8,4 Z" fill="#6366f1" />
                </marker>
                <marker id="me-bar" orient="auto" refX="2" refY="5" markerWidth="6" markerHeight="10">
                    <line x1="2" y1="0" x2="2" y2="10" stroke="#6366f1" strokeWidth="2" />
                </marker>
                <marker id="ms-bar" orient="auto-start-reverse" refX="2" refY="5" markerWidth="6" markerHeight="10">
                    <line x1="2" y1="0" x2="2" y2="10" stroke="#6366f1" strokeWidth="2" />
                </marker>
            </defs>
        </svg>
    );
}
