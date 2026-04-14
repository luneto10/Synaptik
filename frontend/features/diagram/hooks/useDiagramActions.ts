import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useDiagramStore } from "../store/diagramStore";
import {
    saveDiagram,
    loadDiagramById,
    type DiagramPayload,
} from "../api/diagram.api";
import { LAYOUT } from "../constants";
import type { TableNode, RelationEdge } from "../types/flow.types";

export function useDiagramActions(diagramId?: string) {
    const { fitView } = useReactFlow();
    const loadDiagram = useDiagramStore((s) => s.loadDiagram);

    const { mutate: save, isPending } = useMutation<
        { id: string },
        Error,
        DiagramPayload
    >({ mutationFn: saveDiagram });

    const handleSave = useCallback(() => {
        const { nodes, edges } = useDiagramStore.getState();
        save({ nodes, edges });
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
