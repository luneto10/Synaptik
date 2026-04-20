import { useCallback } from "react";
import {
    beginDiagramHistoryGesture,
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
} from "../store/diagramHistory";

export function useHistoryGestureHandlers() {
    const beginGesture = useCallback(() => {
        beginDiagramHistoryGesture();
    }, []);

    const endGesture = useCallback(() => {
        endDiagramHistoryGestureDeferred();
    }, []);

    const endGestureIfActive = useCallback(() => {
        endDiagramHistoryGestureIfActive();
    }, []);

    return {
        beginGesture,
        endGesture,
        endGestureIfActive,
    };
}
