"use client";

import { memo } from "react";
import { createPortal } from "react-dom";
import { useStore, useReactFlow } from "@xyflow/react";
import {
    computeBBox,
    cornerFlowPos,
    SELECTION_RESIZER_CORNERS,
    SELECTION_RESIZER_HANDLE_SIZE,
} from "../../utils/selectionResizer";
import type { SelectionResizerCorner } from "../../utils/selectionResizer";
import { useSelectionResizerArea } from "../../hooks/useSelectionResizerArea";
import { useSelectionResizerDrag } from "../../hooks/useSelectionResizerDrag";

export {
    applyScale,
    computeBBox,
    computeScale,
    minAllowedScale,
} from "../../utils/selectionResizer";
export type {
    SelectionResizerBBox as BBox,
    SelectionResizerNodeSnapshot as NodeSnapshot,
} from "../../utils/selectionResizer";

export const SelectionResizer = memo(function SelectionResizer() {
    const selectedNodes = useStore((s) => s.nodes.filter((n) => n.selected));
    const userSelectionActive = useStore((s) => s.userSelectionActive);
    // Re-render on pan/zoom so screen-space handles stay in sync
    useStore((s) => s.transform);

    const { flowToScreenPosition, getViewport } = useReactFlow();
    const areaSelected = useSelectionResizerArea(
        userSelectionActive,
        selectedNodes.length,
    );
    const onPointerDown = useSelectionResizerDrag({ selectedNodes, getViewport });

    if (!areaSelected || selectedNodes.length < 2) return null;

    const bbox = computeBBox(selectedNodes);

    const cornerScreenPos = Object.fromEntries(
        SELECTION_RESIZER_CORNERS.map(({ id }) => [
            id,
            flowToScreenPosition(cornerFlowPos(id, bbox)),
        ]),
    ) as Record<SelectionResizerCorner, { x: number; y: number }>;

    return createPortal(
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
            {SELECTION_RESIZER_CORNERS.map(({ id, cursor }) => {
                const { x, y } = cornerScreenPos[id];
                return (
                    <div
                        key={id}
                        style={{
                            position: "absolute",
                            left: x - SELECTION_RESIZER_HANDLE_SIZE / 2,
                            top: y - SELECTION_RESIZER_HANDLE_SIZE / 2,
                            width: SELECTION_RESIZER_HANDLE_SIZE,
                            height: SELECTION_RESIZER_HANDLE_SIZE,
                            cursor,
                            pointerEvents: "all",
                            background: "var(--background)",
                            border: "2px solid rgba(99,102,241,0.85)",
                            borderRadius: "50%",
                            boxShadow: "0 0 0 3px rgba(99,102,241,0.2), 0 2px 6px rgba(0,0,0,0.25)",
                        }}
                        onPointerDown={(e) => onPointerDown(e, id, bbox)}
                    />
                );
            })}
        </div>,
        document.body,
    );
});
