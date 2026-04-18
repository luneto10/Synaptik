import { describe, expect, it } from "vitest";
import { computeEdgeOffsets } from "../../../features/diagram/store/edgeLayout";
import { EDGE_STYLE, LAYOUT } from "../../../features/diagram/constants";
import type {
    RelationEdge,
    TableNode,
} from "../../../features/diagram/types/flow.types";

const makeNode = (
    id: string,
    x: number,
    y: number,
    w: number = LAYOUT.DEFAULT_NODE_WIDTH,
    h: number = LAYOUT.DEFAULT_NODE_HEIGHT,
): TableNode =>
    ({
        id,
        type: "tableNode",
        position: { x, y },
        measured: { width: w, height: h },
        data: { id, name: id, columns: [] },
    }) as TableNode;

const makeEdge = (id: string, source: string, target: string): RelationEdge => ({
    id,
    source,
    target,
    type: "relation",
});

describe("computeEdgeOffsets", () => {
    it("returns baseOffset for a single edge with no siblings or obstacles", () => {
        const nodes = [makeNode("a", 0, 0), makeNode("b", 800, 0)];
        const edges = [makeEdge("e1", "a", "b")];

        const offsets = computeEdgeOffsets(nodes, edges);

        expect(offsets.get("e1")).toBe(EDGE_STYLE.baseOffset);
    });

    it("applies lane penalty to siblings sharing a source and direction", () => {
        const nodes = [
            makeNode("a", 0, 0),
            makeNode("b", 800, 0),
            makeNode("c", 800, 400),
        ];
        const edges = [makeEdge("e1", "a", "b"), makeEdge("e2", "a", "c")];

        const offsets = computeEdgeOffsets(nodes, edges);

        // Two same-source, same-direction siblings → lane indices 0 and 1,
        // centered around 0.5 → |-0.5| and |0.5| both contribute 0.5 * laneStep.
        expect(offsets.get("e1")).toBe(
            EDGE_STYLE.baseOffset + 0.5 * EDGE_STYLE.laneStep,
        );
        expect(offsets.get("e2")).toBe(
            EDGE_STYLE.baseOffset + 0.5 * EDGE_STYLE.laneStep,
        );
    });

    it("does not group siblings going in opposite horizontal directions", () => {
        const nodes = [
            makeNode("a", 500, 0),
            makeNode("b", 900, 0), // right of a
            makeNode("c", 100, 0), // left of a
        ];
        const edges = [makeEdge("e1", "a", "b"), makeEdge("e2", "a", "c")];

        const offsets = computeEdgeOffsets(nodes, edges);

        // Each edge is alone in its direction lane → no lane penalty.
        expect(offsets.get("e1")).toBe(EDGE_STYLE.baseOffset);
        expect(offsets.get("e2")).toBe(EDGE_STYLE.baseOffset);
    });

    it("adds obstacleStep for each node that overlaps the edge's bounding box", () => {
        const nodes = [
            makeNode("a", 0, 0),
            makeNode("b", 1200, 0),
            // Obstacle sits between a and b at the same y band.
            makeNode("obs", 500, 0),
        ];
        const edges = [makeEdge("e1", "a", "b")];

        const offsets = computeEdgeOffsets(nodes, edges);

        expect(offsets.get("e1")).toBe(
            EDGE_STYLE.baseOffset + EDGE_STYLE.obstacleStep,
        );
    });

    it("caches by (nodes, edges) reference pair", () => {
        const nodes = [makeNode("a", 0, 0), makeNode("b", 800, 0)];
        const edges = [makeEdge("e1", "a", "b")];

        const first = computeEdgeOffsets(nodes, edges);
        const second = computeEdgeOffsets(nodes, edges);

        expect(second).toBe(first);
    });

    it("falls back to baseOffset when source or target node is missing", () => {
        const nodes = [makeNode("a", 0, 0)];
        const edges = [makeEdge("e1", "a", "missing")];

        const offsets = computeEdgeOffsets(nodes, edges);

        expect(offsets.get("e1")).toBe(EDGE_STYLE.baseOffset);
    });
});
