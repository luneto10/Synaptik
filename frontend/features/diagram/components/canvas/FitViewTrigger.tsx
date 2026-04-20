"use client";

import { useEffect } from "react";
import { useDeferredFitView } from "../../hooks/useDeferredFitView";

interface FitViewTriggerProps {
    nodeId: string | null;
    onDone: () => void;
}

/**
 * Rendered inside <ReactFlow> so useReactFlow() is always in scope.
 * When nodeId changes to a non-null value, zooms to that node and calls onDone.
 */
export function FitViewTrigger({ nodeId, onDone }: FitViewTriggerProps) {
    const { deferredFitView } = useDeferredFitView();

    useEffect(() => {
        if (!nodeId) return;
        const id = deferredFitView(
            {
                nodes: [{ id: nodeId }],
                duration: 400,
                padding: 0.35,
                maxZoom: 1.2,
            },
            80,
            onDone
        );
        return () => clearTimeout(id);
    }, [nodeId, deferredFitView, onDone]);

    return null;
}
