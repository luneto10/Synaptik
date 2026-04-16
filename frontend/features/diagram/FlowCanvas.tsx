"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { DiagramCanvas } from "./DiagramCanvas";

/**
 * Wraps DiagramCanvas in a ReactFlowProvider so every child component can
 * call useReactFlow() without needing its own provider.
 */
export default function FlowCanvas() {
    return (
        <ReactFlowProvider>
            <DiagramCanvas />
        </ReactFlowProvider>
    );
}
