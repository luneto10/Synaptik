import { useCallback } from "react";
import type { FitViewOptions } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { scheduleFitView } from "../constants";

export function useDeferredFitView() {
    const { fitView } = useReactFlow();

    const deferredFitView = useCallback(
        (options?: FitViewOptions, delayMs?: number, onDone?: () => void) =>
            scheduleFitView(fitView, options, delayMs, onDone),
        [fitView],
    );

    return { deferredFitView };
}
