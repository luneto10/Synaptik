import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDiagramStore } from "../store/diagramStore";
import { saveDiagram, type DiagramPayload } from "../api/diagram.api";
import { FIT_VIEW_PADDING } from "../constants";
import type { DiagramNode, RelationEdge } from "../types/flow.types";
import { isTableNode } from "../types/flow.types";
import { buildAutoLayoutChanges } from "../layout/autoLayout";
import { useDeferredFitView } from "./useDeferredFitView";

export function useDiagramActions() {
    const { deferredFitView } = useDeferredFitView();
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
        deferredFitView({ padding: FIT_VIEW_PADDING });
    }, [loadDiagram, deferredFitView]);

    const handleAutoLayout = useCallback(async () => {
        const { nodes, edges, onNodesChange, normalizeEdgeHandleDirections } =
            useDiagramStore.getState();
        const changes = await buildAutoLayoutChanges(
            nodes.filter(isTableNode),
            edges,
        );

        onNodesChange(changes);
        normalizeEdgeHandleDirections();
        deferredFitView({ padding: FIT_VIEW_PADDING });
    }, [deferredFitView]);

    return { isPending, handleSave, handleLoadExample, handleAutoLayout };
}
