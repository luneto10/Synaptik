import { describe, expect, it } from "vitest";
import type { DiagramNode, RelationEdge } from "../../../features/diagram/types/flow.types";
import {
    createHistoryDiagramSnapshot,
    createPersistedDiagramSnapshot,
} from "../../../features/diagram/utils/diagramSnapshot";

describe("diagramSnapshot", () => {
    const nodes = [
        {
            id: "users",
            type: "tableNode",
            position: { x: 10, y: 20 },
            data: {
                id: "users",
                name: "users",
                columns: [],
            },
            width: 320,
            height: 240,
            measured: { width: 320, height: 240 },
            selected: true,
            dragging: true,
            resizing: true,
            positionAbsolute: { x: 10, y: 20 },
        },
    ] as DiagramNode[];
    const edges = [
        {
            id: "e1",
            source: "users",
            target: "orders",
            sourceHandle: "s",
            targetHandle: "t",
            type: "relationship",
            selected: true,
            data: {
                sourceColumnId: "pk",
                targetColumnId: "fk",
                relationshipType: "one-to-many",
            },
        },
    ] as RelationEdge[];

    it("drops transient runtime fields for persisted snapshot", () => {
        const snapshot = createPersistedDiagramSnapshot(nodes, edges);
        const persistedNode = snapshot.nodes[0] as DiagramNode & {
            selected?: boolean;
            dragging?: boolean;
            resizing?: boolean;
            positionAbsolute?: { x: number; y: number };
        };
        const persistedEdge = snapshot.edges[0] as RelationEdge & {
            selected?: boolean;
        };

        expect(persistedNode.id).toBe("users");
        expect(persistedNode.measured).toBeUndefined();
        expect(persistedNode.selected).toBeUndefined();
        expect(persistedNode.dragging).toBeUndefined();
        expect(persistedNode.resizing).toBeUndefined();
        expect(persistedNode.positionAbsolute).toBeUndefined();
        expect(persistedEdge.selected).toBeUndefined();
    });

    it("keeps measured dimensions for history snapshot", () => {
        const snapshot = createHistoryDiagramSnapshot(nodes, edges);
        expect(snapshot.nodes[0]?.measured).toEqual({ width: 320, height: 240 });
        expect(snapshot.edges[0]?.data?.relationshipType).toBe("one-to-many");
    });
});
