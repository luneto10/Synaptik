import { describe, expect, it } from "vitest";
import {
    computeBBox,
    applyScale,
    minAllowedScale,
    computeScale,
    type BBox,
    type NodeSnapshot,
} from "../../../features/diagram/components/canvas/SelectionResizer";
import { BOX_NODE_TYPE } from "../../../features/diagram/types/flow.types";

function snap(id: string, type: string, x: number, y: number, w: number, h: number): NodeSnapshot {
    return { id, type, x, y, w, h };
}

function makeNode(id: string, x: number, y: number, w: number, h: number) {
    return {
        id,
        position: { x, y },
        measured: { width: w, height: h },
        data: {},
    } as Parameters<typeof computeBBox>[0][number];
}

describe("computeBBox", () => {
    it("spans all nodes", () => {
        const bbox = computeBBox([makeNode("a", 0, 0, 100, 50), makeNode("b", 200, 100, 80, 60)]);
        expect(bbox).toEqual({ minX: 0, minY: 0, maxX: 280, maxY: 160 });
    });
});

describe("applyScale", () => {
    it("scales position and size from anchor", () => {
        const s = snap("a", "tableNode", 100, 50, 280, 200);
        const r = applyScale(s, 0, 0, 2);
        expect(r.position).toEqual({ x: 200, y: 100 });
        expect(r.width).toBe(560);
        expect(r.height).toBe(400);
    });

    it("node at anchor stays fixed", () => {
        const s = snap("a", "tableNode", 0, 0, 280, 200);
        expect(applyScale(s, 0, 0, 2).position).toEqual({ x: 0, y: 0 });
    });

    it("clamps to min dimensions", () => {
        const r = applyScale(snap("b", BOX_NODE_TYPE, 0, 0, 200, 150), 0, 0, 0.001);
        expect(r.width).toBeGreaterThan(0);
        expect(r.height).toBeGreaterThan(0);
    });

    it("stacked nodes never overlap when scaling down", () => {
        const rA = applyScale(snap("a", "tableNode", 0, 0,   280, 200), 0, 0, 0.5);
        const rB = applyScale(snap("b", "tableNode", 0, 300, 280, 200), 0, 0, 0.5);
        expect(rB.position.y).toBeGreaterThanOrEqual(rA.position.y + rA.height);
    });
});

describe("minAllowedScale", () => {
    it("returns the scale below which a node would violate its min size", () => {
        // tableNode w=280 → min 280 → minScale=1.0 for width
        const s = snap("t", "tableNode", 0, 0, 280, 400);
        // MIN_NODE_WIDTH=280, so 280/280=1 for width; MIN_NODE_HEIGHT=120, so 120/400=0.3 for height
        const ms = minAllowedScale([s]);
        expect(ms).toBeCloseTo(1, 5); // constrained by width
    });

    it("takes the maximum across all nodes", () => {
        const large = snap("a", "tableNode", 0, 0, 560, 400);   // minScale = 280/560 = 0.5
        const small = snap("b", "tableNode", 0, 0, 290, 400);   // minScale ≈ 280/290 ≈ 0.966
        expect(minAllowedScale([large, small])).toBeCloseTo(280 / 290, 3);
    });
});

describe("computeScale", () => {
    const bbox: BBox = { minX: 0, minY: 0, maxX: 200, maxY: 100 };

    it("se drag: anchor is NW, scale > 1 when expanding", () => {
        const { anchorX, anchorY, scale } = computeScale("se", bbox, 100, 50);
        expect(anchorX).toBe(0);
        expect(anchorY).toBe(0);
        expect(scale).toBeGreaterThan(1);
    });

    it("nw drag: anchor is SE, scale > 1 when expanding (negative delta)", () => {
        const { anchorX, anchorY, scale } = computeScale("nw", bbox, -100, -50);
        expect(anchorX).toBe(200);
        expect(anchorY).toBe(100);
        expect(scale).toBeGreaterThan(1);
    });

    it("scale = 1 when delta is zero", () => {
        const { scale } = computeScale("se", bbox, 0, 0);
        expect(scale).toBeCloseTo(1);
    });
});
