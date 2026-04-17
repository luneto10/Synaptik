import { describe, expect, it } from "vitest";
import {
    getHandleSide,
    handleIds,
    sourceColumnIdFromHandle,
    targetColumnIdFromHandle,
} from "../../../features/diagram/utils/handleIds";

describe("handleIds", () => {
    it("builds all source/target handle IDs from a column ID", () => {
        expect(handleIds("col-1")).toEqual({
            sourceRight: "col-1-source-right",
            sourceLeft: "col-1-source-left",
            targetLeft: "col-1-target-left",
            targetRight: "col-1-target-right",
        });
    });
});

describe("getHandleSide", () => {
    it("returns side for source handles", () => {
        expect(getHandleSide("col-a-source-left", "source")).toBe("left");
        expect(getHandleSide("col-a-source-right", "source")).toBe("right");
    });

    it("returns side for target handles", () => {
        expect(getHandleSide("col-a-target-right", "target")).toBe("right");
        expect(getHandleSide("col-a-target-left", "target")).toBe("left");
    });

    it("defaults to right when handle is missing", () => {
        expect(getHandleSide(undefined, "source")).toBe("right");
        expect(getHandleSide(null, "target")).toBe("right");
    });
});

describe("sourceColumnIdFromHandle", () => {
    it("strips -source-right suffix", () => {
        expect(sourceColumnIdFromHandle("col-1-source-right")).toBe("col-1");
    });

    it("strips -source-left suffix", () => {
        expect(sourceColumnIdFromHandle("col-1-source-left")).toBe("col-1");
    });

    it("returns undefined for null or undefined", () => {
        expect(sourceColumnIdFromHandle(null)).toBeUndefined();
        expect(sourceColumnIdFromHandle(undefined)).toBeUndefined();
    });
});

describe("targetColumnIdFromHandle", () => {
    it("strips -target-left suffix", () => {
        expect(targetColumnIdFromHandle("col-1-target-left")).toBe("col-1");
    });

    it("strips -target-right suffix", () => {
        expect(targetColumnIdFromHandle("col-1-target-right")).toBe("col-1");
    });

    it("returns undefined for null or undefined", () => {
        expect(targetColumnIdFromHandle(null)).toBeUndefined();
        expect(targetColumnIdFromHandle(undefined)).toBeUndefined();
    });
});
