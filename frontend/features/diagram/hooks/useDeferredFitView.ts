import { useCallback } from "react";
import type { FitViewOptions } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { scheduleFitView } from "../constants";

export function scheduleDeferredFitView(
    fitView: (options?: FitViewOptions) => void | Promise<unknown>,
    options?: FitViewOptions,
    delayMs?: number,
    onDone?: () => void,
) {
    return scheduleFitView(fitView, options, delayMs, onDone);
}

export function useDeferredFitView() {
    const { fitView } = useReactFlow();

    const deferredFitView = useCallback(
        (options?: FitViewOptions, delayMs?: number, onDone?: () => void) =>
            scheduleDeferredFitView(fitView, options, delayMs, onDone),
        [fitView],
    );

    return { deferredFitView };
}
