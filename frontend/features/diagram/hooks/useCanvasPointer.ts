import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useReactFlow } from "@xyflow/react";

/**
 * Tracks the pointer's last client position while it hovers the diagram
 * container and exposes a `getFlowPosition()` callback that converts it
 * to React Flow coordinates on demand.
 *
 * Returns null until the pointer has moved over the container at least once
 * (e.g. the user pressed Ctrl+V without ever hovering the canvas).
 */
export function useCanvasPointer(
    containerRef: RefObject<HTMLDivElement | null>,
) {
    const { screenToFlowPosition } = useReactFlow();
    const screenRef = useRef<{ x: number; y: number } | null>(null);
    const screenToFlowRef = useRef(screenToFlowPosition);

    useEffect(() => {
        screenToFlowRef.current = screenToFlowPosition;
    }, [screenToFlowPosition]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const onMove = (e: MouseEvent) => {
            screenRef.current = { x: e.clientX, y: e.clientY };
        };
        const onLeave = () => {
            screenRef.current = null;
        };
        container.addEventListener("mousemove", onMove);
        container.addEventListener("mouseleave", onLeave);
        return () => {
            container.removeEventListener("mousemove", onMove);
            container.removeEventListener("mouseleave", onLeave);
        };
    }, [containerRef]);

    const getFlowPosition = useCallback((): { x: number; y: number } | null => {
        if (!screenRef.current) return null;
        return screenToFlowRef.current(screenRef.current);
    }, []);

    return { getFlowPosition };
}
