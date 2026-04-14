import { describe, expect, it } from "vitest";
import { getHandleSide, handleIds } from "../../../features/diagram/utils/handleIds";

describe("handleIds", () => {
    it("builds all source/target handle IDs from a column ID", () => {
        expect(handleIds("col-1")).toEqual({
            sourceRight: "col-1-source",
            sourceLeft: "col-1-source-left",
            targetLeft: "col-1-target",
            targetRight: "col-1-target-right",
        });
    });
});

describe("getHandleSide", () => {
    it("returns side for source handles", () => {
        expect(getHandleSide("col-a-source-left", "source")).toBe("left");
        expect(getHandleSide("col-a-source", "source")).toBe("right");
    });

    it("returns side for target handles", () => {
        expect(getHandleSide("col-a-target-right", "target")).toBe("right");
        expect(getHandleSide("col-a-target", "target")).toBe("left");
    });

    it("defaults safely when handle is missing", () => {
        expect(getHandleSide(undefined, "source")).toBe("right");
    });
});
