// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsolatedEdges } from "../../../features/diagram/hooks/useIsolatedEdges";
import type { RelationEdge } from "../../../features/diagram/types/flow.types";

const makeEdge = (
    id: string,
    source: string,
    target: string,
    hidden?: boolean,
): RelationEdge => ({
    id,
    source,
    target,
    type: "relation",
    ...(hidden !== undefined ? { hidden } : {}),
});

describe("useIsolatedEdges", () => {
    it("returns the input reference when isolation is disabled", () => {
        const edges = [makeEdge("e1", "a", "b")];
        const { result } = renderHook(() =>
            useIsolatedEdges(edges, ["a"], false),
        );
        expect(result.current).toBe(edges);
    });

    it("returns the input reference when no nodes are selected", () => {
        const edges = [makeEdge("e1", "a", "b")];
        const { result } = renderHook(() => useIsolatedEdges(edges, [], true));
        expect(result.current).toBe(edges);
    });

    it("preserves identity of edges whose hidden state would not change", () => {
        const edges = [
            makeEdge("e1", "a", "b"),
            makeEdge("e2", "c", "d"),
        ];
        const { result } = renderHook(() =>
            useIsolatedEdges(edges, ["a"], true),
        );

        // e1 touches selected node "a" → should be returned as-is (no clone).
        expect(result.current[0]).toBe(edges[0]);
        // e2 should be cloned with hidden: true (identity differs).
        expect(result.current[1]).not.toBe(edges[1]);
        expect(result.current[1].hidden).toBe(true);
    });

    it("returns the original array reference when no edge's hidden flag would change", () => {
        // Every edge already hidden-matches its expected isolation state.
        const edges = [
            makeEdge("e1", "a", "b"),
            makeEdge("e2", "c", "d", true),
        ];
        const { result } = renderHook(() =>
            useIsolatedEdges(edges, ["a"], true),
        );
        expect(result.current).toBe(edges);
    });
});
