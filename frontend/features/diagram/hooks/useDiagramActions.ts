import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import { useDiagramStore } from "../store/diagramStore";
import { type SaveDiagramRequest } from "../api/diagram.api";
import { LAYOUT } from "../constants";
import type { TableNode, RelationEdge } from "../types/flow.types";

export function useDiagramActions() {
    const { fitView } = useReactFlow();
    const loadDiagram = useDiagramStore((s) => s.loadDiagram);

    const { mutate: save, isPending } = useMutation({
        mutationFn: async (payload: SaveDiagramRequest) => {
            console.log("Payload →", JSON.stringify(payload, null, 2));
            return { sql: "" };
        },
        onSuccess: () => console.log("Mock save — backend not connected yet"),
    });

    const handleSave = useCallback(() => {
        const { nodes: n, edges: e } = useDiagramStore.getState();
        save({ tables: n.map((node) => node.data), edges: e });
    }, [save]);

    const handleLoadExample = useCallback(async () => {
        const { default: example } = await import("../mock/ecommerce.json");
        loadDiagram(
            example.nodes as TableNode[],
            example.edges as RelationEdge[],
        );
        setTimeout(() => fitView({ padding: 0.3 }), 50);
    }, [loadDiagram, fitView]);

    // Reads fresh node positions from the store instead of closing over them,
    // so the callback never goes stale between renders.
    const handleAutoLayout = useCallback(() => {
        const { nodes, onNodesChange } = useDiagramStore.getState();
        const changes = nodes.map((n, i) => ({
            id: n.id,
            type: "position" as const,
            position: {
                x: LAYOUT.ORIGIN_X + (i % LAYOUT.COLS) * LAYOUT.GAP_X,
                y: LAYOUT.ORIGIN_Y + Math.floor(i / LAYOUT.COLS) * LAYOUT.GAP_Y,
            },
        }));
        onNodesChange(changes);
        setTimeout(() => fitView({ padding: 0.3 }), 50);
    }, [fitView]);

    return { isPending, handleSave, handleLoadExample, handleAutoLayout };
}
