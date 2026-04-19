import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { DiagramTool } from "../components/canvas/LeftToolbox";

interface UseGrabModeOptions {
    containerRef: RefObject<HTMLDivElement | null>;
    activeTool: DiagramTool;
    setActiveTool: (tool: DiagramTool) => void;
}

/**
 * Manages middle / right mouse button "grab to pan" behaviour:
 *
 *  - Shows a grabbing cursor on the ReactFlow pane (ReactFlow sets this via
 *    inline JS, so we must write the style directly on the element).
 *  - In non-select tools, temporarily switches to "select" while an aux
 *    button is held so ReactFlow pans naturally instead of drawing a
 *    selection rectangle.  The previous tool is restored on release.
 *  - Three release paths guard against the cursor getting stuck:
 *      1. onMouseUpCapture   – normal release inside the window
 *      2. document mouseup   – release outside the window
 *      3. onMouseMoveCapture – checks the live e.buttons bitmask
 */
export function useGrabMode({
    containerRef,
    activeTool,
    setActiveTool,
}: UseGrabModeOptions) {
    const [isGrabbing, setIsGrabbing] = useState(false);
    const tempToolRef = useRef<DiagramTool | null>(null);

    const restoreToolAfterGrab = useCallback(() => {
        setIsGrabbing(false);
        if (tempToolRef.current !== null) {
            setActiveTool(tempToolRef.current);
            tempToolRef.current = null;
        }
    }, [setActiveTool]);

    useEffect(() => {
        if (!containerRef.current) return;
        const pane = containerRef.current.querySelector(
            ".react-flow__pane",
        ) as HTMLElement | null;
        if (!pane) return;
        pane.style.cursor = isGrabbing ? "grabbing" : "default";
    }, [isGrabbing, containerRef]);

    useEffect(() => {
        const onDocMouseUp = (e: MouseEvent) => {
            if (e.button === 1 || e.button === 2) restoreToolAfterGrab();
        };
        const onDocPointerUp = () => restoreToolAfterGrab();
        document.addEventListener("mouseup", onDocMouseUp);
        document.addEventListener("pointerup", onDocPointerUp);
        return () => {
            document.removeEventListener("mouseup", onDocMouseUp);
            document.removeEventListener("pointerup", onDocPointerUp);
        };
    }, [restoreToolAfterGrab]);

    const onMouseDownCapture = useCallback(
        (e: React.MouseEvent) => {
            if (e.button === 1 || e.button === 2) {
                setIsGrabbing(true);
                if (activeTool !== "select" && tempToolRef.current === null) {
                    tempToolRef.current = activeTool;
                    setActiveTool("select");
                }
            }
        },
        [activeTool, setActiveTool],
    );

    const onMouseUpCapture = useCallback(
        (e: React.MouseEvent) => {
            if (e.button === 1 || e.button === 2) restoreToolAfterGrab();
        },
        [restoreToolAfterGrab],
    );

    // Live bitmask check: bits 1=left 2=right 4=middle.
    const onMouseMoveCapture = useCallback(
        (e: React.MouseEvent) => {
            if (isGrabbing && (e.buttons & 6) === 0) restoreToolAfterGrab();
        },
        [isGrabbing, restoreToolAfterGrab],
    );

    return {
        isGrabbing,
        onMouseDownCapture,
        onMouseUpCapture,
        onMouseMoveCapture,
    };
}
