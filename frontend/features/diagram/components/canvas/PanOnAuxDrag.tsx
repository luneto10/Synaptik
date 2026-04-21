"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

/**
 * Enables middle and right mouse button drag-to-pan when the drag starts on a
 * node or edge element (React Flow's built-in panOnDrag only activates on the
 * background pane). Must render inside <ReactFlow> to access useReactFlow().
 */
export function PanOnAuxDrag() {
    const { getViewport, setViewport } = useReactFlow();

    useEffect(() => {
        let startPos: { x: number; y: number } | null = null;
        let startVp: { x: number; y: number; zoom: number } | null = null;
        let frameId: number | null = null;
        let latestPoint: { x: number; y: number } | null = null;

        const isOnNode = (target: EventTarget | null): boolean => {
            if (!(target instanceof Element)) return false;
            return !!target.closest(".react-flow__node, .react-flow__edge");
        };

        const onMouseDown = (e: MouseEvent) => {
            if ((e.button !== 1 && e.button !== 2) || !isOnNode(e.target)) return;
            e.preventDefault();
            startPos = { x: e.clientX, y: e.clientY };
            startVp = getViewport();
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!startPos || !startVp) return;
            if (!(e.buttons & 6)) {
                startPos = null;
                startVp = null;
                latestPoint = null;
                if (frameId !== null) {
                    cancelAnimationFrame(frameId);
                    frameId = null;
                }
                return;
            }
            latestPoint = { x: e.clientX, y: e.clientY };
            if (frameId !== null) return;

            frameId = requestAnimationFrame(() => {
                frameId = null;
                if (!startPos || !startVp || !latestPoint) return;
                setViewport(
                    {
                        x: startVp.x + (latestPoint.x - startPos.x),
                        y: startVp.y + (latestPoint.y - startPos.y),
                        zoom: startVp.zoom,
                    },
                    { duration: 0 },
                );
            });
        };

        const onMouseUp = (e: MouseEvent) => {
            if (e.button === 1 || e.button === 2) {
                startPos = null;
                startVp = null;
                latestPoint = null;
                if (frameId !== null) {
                    cancelAnimationFrame(frameId);
                    frameId = null;
                }
            }
        };

        document.addEventListener("mousedown", onMouseDown, true);
        document.addEventListener("mousemove", onMouseMove, true);
        document.addEventListener("mouseup", onMouseUp, true);
        return () => {
            document.removeEventListener("mousedown", onMouseDown, true);
            document.removeEventListener("mousemove", onMouseMove, true);
            document.removeEventListener("mouseup", onMouseUp, true);
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }
        };
    }, [getViewport, setViewport]);

    return null;
}
