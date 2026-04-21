import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import { BOX } from "../constants";
import type { DiagramTool } from "../components/canvas/LeftToolbox";
import { getFlowPane } from "./useGrabMode";

export type BoxPreview = { x: number; y: number; w: number; h: number };

interface UseAddBoxModeOptions {
    containerRef: RefObject<HTMLDivElement | null>;
    activeTool: DiagramTool;
    setActiveTool: (tool: DiagramTool) => void;
}

/**
 * Miro-style drag-to-create for category boxes. Active only while
 * `activeTool === "addBox"`. Pointer-down on the ReactFlow pane starts a
 * screen-space drag; pointer-up commits a box at that rect in flow coords
 * (below the MIN_WIDTH/MIN_HEIGHT floor from BOX constants), then returns
 * the tool to "select" so the user can immediately move or resize it.
 *
 * Drags below `BOX.CREATE_THRESHOLD` pixels are treated as a click — we
 * cancel the gesture rather than create a tiny unintended box.
 */
export function useAddBoxMode({
    containerRef,
    activeTool,
    setActiveTool,
}: UseAddBoxModeOptions) {
    const { screenToFlowPosition } = useReactFlow();

    const [preview, setPreview] = useState<BoxPreview | null>(null);
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const screenToFlowPositionRef = useRef(screenToFlowPosition);

    useEffect(() => {
        screenToFlowPositionRef.current = screenToFlowPosition;
    }, [screenToFlowPosition]);

    useEffect(() => {
        if (activeTool !== "addBox") return;
        const container = containerRef.current;
        if (!container) return;

        const pane = getFlowPane(containerRef);
        if (!pane) return;

        const previousCursor = pane.style.cursor;
        pane.style.cursor = "crosshair";

        const onDown = (e: MouseEvent) => {
            if (e.button !== 0) return; // left click only
            startRef.current = { x: e.clientX, y: e.clientY };
            setPreview({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
        };

        const onMove = (e: MouseEvent) => {
            const s = startRef.current;
            if (!s) return;
            setPreview({
                x: Math.min(s.x, e.clientX),
                y: Math.min(s.y, e.clientY),
                w: Math.abs(e.clientX - s.x),
                h: Math.abs(e.clientY - s.y),
            });
        };

        const onUp = (e: MouseEvent) => {
            const s = startRef.current;
            startRef.current = null;
            setPreview(null);

            if (!s) return;
            const dx = Math.abs(e.clientX - s.x);
            const dy = Math.abs(e.clientY - s.y);
            const dragged =
                dx >= BOX.CREATE_THRESHOLD || dy >= BOX.CREATE_THRESHOLD;

            if (dragged) {
                const topLeft = screenToFlowPositionRef.current({
                    x: Math.min(s.x, e.clientX),
                    y: Math.min(s.y, e.clientY),
                });
                const bottomRight = screenToFlowPositionRef.current({
                    x: Math.max(s.x, e.clientX),
                    y: Math.max(s.y, e.clientY),
                });
                useDiagramStore.getState().addBox(topLeft, {
                    width: bottomRight.x - topLeft.x,
                    height: bottomRight.y - topLeft.y,
                });
            }

            setActiveTool("select");
        };

        pane.addEventListener("mousedown", onDown);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);

        return () => {
            pane.removeEventListener("mousedown", onDown);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            pane.style.cursor = previousCursor;
            startRef.current = null;
            setPreview(null);
        };
    }, [activeTool, containerRef, setActiveTool]);

    return { preview };
}
