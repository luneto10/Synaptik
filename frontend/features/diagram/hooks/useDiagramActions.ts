import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import dagre from "dagre";
import { useDiagramStore } from "../store/diagramStore";
import { saveDiagram, type DiagramPayload } from "../api/diagram.api";
import { FIT_VIEW_PADDING } from "../constants";
import type { TableNode, RelationEdge } from "../types/flow.types";

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
            example.nodes as TableNode[],
            example.edges as RelationEdge[],
        );
        setTimeout(() => fitView({ padding: FIT_VIEW_PADDING }), 50);
    }, [loadDiagram, fitView]);

    const handleAutoLayout = useCallback(() => {
        const { nodes, edges, onNodesChange } = useDiagramStore.getState();

        const g = new dagre.graphlib.Graph();
        g.setDefaultEdgeLabel(() => ({}));
        g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 140 });

        for (const n of nodes) {
            g.setNode(n.id, {
                width:  (n as TableNode & { measured?: { width?: number } }).measured?.width  ?? 280,
                height: (n as TableNode & { measured?: { height?: number } }).measured?.height ?? 200,
            });
        }
        for (const e of edges) g.setEdge(e.source, e.target);

        dagre.layout(g);

        const changes = nodes.map((n) => {
            const { x, y, width, height } = g.node(n.id);
            return { id: n.id, type: "position" as const, position: { x: x - width / 2, y: y - height / 2 } };
        });

        onNodesChange(changes);
        setTimeout(() => fitView({ padding: FIT_VIEW_PADDING }), 50);
    }, [fitView]);

    return { isPending, handleSave, handleLoadExample, handleAutoLayout };
}
