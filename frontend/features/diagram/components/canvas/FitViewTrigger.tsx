"use client";

import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";

interface FitViewTriggerProps {
    nodeId: string | null;
    onDone: () => void;
}

/**
 * Rendered inside <ReactFlow> so useReactFlow() is always in scope.
 * When nodeId changes to a non-null value, zooms to that node and calls onDone.
 */
export function FitViewTrigger({ nodeId, onDone }: FitViewTriggerProps) {
    const { fitView } = useReactFlow();

    // Keep `onDone` in a ref so the zoom effect doesn't re-run when the caller
    // passes a fresh function each render.
    const onDoneRef = useRef(onDone);
    useEffect(() => {
        onDoneRef.current = onDone;
    }, [onDone]);

    useEffect(() => {
        if (!nodeId) return;
        const id = setTimeout(() => {
            fitView({
                nodes: [{ id: nodeId }],
                duration: 400,
                padding: 0.35,
                maxZoom: 1.2,
            });
            onDoneRef.current();
        }, 80);
        return () => clearTimeout(id);
    }, [nodeId, fitView]);

    return null;
}
