import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import { useDiagramStore } from "../store/diagramStore";
import { saveDiagram, type DiagramPayload } from "../api/diagram.api";
import { FIT_VIEW_PADDING, REFLOW_DELAY_MS } from "../constants";
import type { DiagramNode, RelationEdge } from "../types/flow.types";
import { isTableNode } from "../types/flow.types";
import { buildAutoLayoutChanges } from "../layout/autoLayout";

export function useDiagramActions() {
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
            example.nodes as DiagramNode[],
            example.edges as RelationEdge[],
        );
        setTimeout(
            () => fitView({ padding: FIT_VIEW_PADDING }),
            REFLOW_DELAY_MS,
        );
    }, [loadDiagram, fitView]);

    const handleAutoLayout = useCallback(async () => {
        const { nodes, edges, onNodesChange, normalizeEdgeHandleDirections } =
            useDiagramStore.getState();
        const changes = await buildAutoLayoutChanges(
            nodes.filter(isTableNode),
            edges,
        );

        onNodesChange(changes);
        normalizeEdgeHandleDirections();
        setTimeout(
            () => fitView({ padding: FIT_VIEW_PADDING }),
            REFLOW_DELAY_MS,
        );
    }, [fitView]);

    return { isPending, handleSave, handleLoadExample, handleAutoLayout };
}
