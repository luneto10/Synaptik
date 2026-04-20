import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Node } from "@xyflow/react";
import {
    beginDiagramHistoryGesture,
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
} from "../store/diagramHistory";
import { useDiagramStore } from "../store/diagramStore";
import {
    buildScaledNodeChanges,
    computeScale,
    createDragState,
    createNodeSnapshots,
    type SelectionResizerBBox,
    type SelectionResizerCorner,
    type SelectionResizerDragState,
} from "../utils/selectionResizer";

interface UseSelectionResizerDragArgs {
    selectedNodes: Node[];
    getViewport: () => { x: number; y: number; zoom: number };
}

export function useSelectionResizerDrag({
    selectedNodes,
    getViewport,
}: UseSelectionResizerDragArgs) {
    const dragRef = useRef<SelectionResizerDragState | null>(null);

    return useCallback(
        (
            event: ReactPointerEvent<HTMLDivElement>,
            corner: SelectionResizerCorner,
            bbox: SelectionResizerBBox,
        ) => {
            event.stopPropagation();
            event.preventDefault();
            endDiagramHistoryGestureIfActive();

            const snapshots = createNodeSnapshots(selectedNodes);
            const { zoom } = getViewport();
            dragRef.current = createDragState(
                corner,
                bbox,
                snapshots,
                event.clientX,
                event.clientY,
                zoom,
            );

            const applyChanges = useDiagramStore.getState().onNodesChange;

            const handleMove = (moveEvent: PointerEvent) => {
                const drag = dragRef.current;
                if (!drag) return;

                const dx = (moveEvent.clientX - drag.startX) / drag.zoom;
                const dy = (moveEvent.clientY - drag.startY) / drag.zoom;
                const { anchorX, anchorY, scale: rawScale } = computeScale(
                    drag.corner,
                    drag.bbox,
                    dx,
                    dy,
                );
                const scale = Math.max(rawScale, drag.minScale);

                applyChanges(
                    buildScaledNodeChanges(drag.snapshots, anchorX, anchorY, scale),
                );

                if (!drag.historyStarted) {
                    beginDiagramHistoryGesture();
                    dragRef.current = { ...drag, historyStarted: true };
                }
            };

            const handleUp = () => {
                const shouldEndGesture = dragRef.current?.historyStarted ?? false;
                dragRef.current = null;
                if (shouldEndGesture) {
                    endDiagramHistoryGestureDeferred();
                }
                window.removeEventListener("pointermove", handleMove);
                window.removeEventListener("pointerup", handleUp);
            };

            window.addEventListener("pointermove", handleMove);
            window.addEventListener("pointerup", handleUp);
        },
        [getViewport, selectedNodes],
    );
}
