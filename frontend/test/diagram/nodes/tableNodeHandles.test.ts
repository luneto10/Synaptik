import { describe, expect, it } from "vitest";
import {
    computeTableMinHeight,
    invisibleTargetStyle,
    rowCenterY,
    routingHandleStyle,
    routingTargetStyle,
    visibleDotStyle,
} from "../../../features/diagram/nodes/tableNodeHandles";

describe("tableNodeHandles helpers", () => {
    it("computes increasing row centers", () => {
        expect(rowCenterY(1)).toBeGreaterThan(rowCenterY(0));
    });

    it("computes min height with required row floor", () => {
        expect(computeTableMinHeight(0)).toBeGreaterThan(0);
        expect(computeTableMinHeight(5)).toBeGreaterThan(computeTableMinHeight(1));
    });

    it("returns expected pointerEvents for styles", () => {
        expect(visibleDotStyle("left", true).pointerEvents).toBe("all");
        expect(invisibleTargetStyle("right").pointerEvents).toBe("all");
        expect(routingHandleStyle(20, "left").pointerEvents).toBe("none");
        expect(routingTargetStyle(20, "right").pointerEvents).toBe("all");
    });
});
