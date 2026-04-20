// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../../../features/diagram/store/diagramHistory", () => ({
    beginDiagramHistoryGesture: vi.fn(),
    endDiagramHistoryGestureDeferred: vi.fn(),
    endDiagramHistoryGestureIfActive: vi.fn(),
}));

import {
    beginDiagramHistoryGesture,
    endDiagramHistoryGestureDeferred,
    endDiagramHistoryGestureIfActive,
} from "../../../features/diagram/store/diagramHistory";
import { useHistoryGestureHandlers } from "../../../features/diagram/hooks/useHistoryGestureHandlers";

describe("useHistoryGestureHandlers", () => {
    it("calls underlying history helpers", () => {
        const { result } = renderHook(() => useHistoryGestureHandlers());

        act(() => {
            result.current.beginGesture();
            result.current.endGesture();
            result.current.endGestureIfActive();
        });

        expect(beginDiagramHistoryGesture).toHaveBeenCalledTimes(1);
        expect(endDiagramHistoryGestureDeferred).toHaveBeenCalledTimes(1);
        expect(endDiagramHistoryGestureIfActive).toHaveBeenCalledTimes(1);
    });
});
