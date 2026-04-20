// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { scheduleFitView } from "../../features/diagram/constants";

describe("scheduleFitView", () => {
    it("defers fitView call and onDone callback", () => {
        vi.useFakeTimers();
        const fitView = vi.fn();
        const onDone = vi.fn();

        scheduleFitView(fitView, { padding: 0.3 }, 50, onDone);
        expect(fitView).not.toHaveBeenCalled();
        expect(onDone).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(fitView).toHaveBeenCalledWith({ padding: 0.3 });
        expect(onDone).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
