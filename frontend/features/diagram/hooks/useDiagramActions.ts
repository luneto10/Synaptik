import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import dagre from "dagre";
import { useDiagramStore } from "../store/diagramStore";
import { saveDiagram, type DiagramPayload } from "../api/diagram.api";
import { FIT_VIEW_PADDING, REFLOW_DELAY_MS, LAYOUT } from "../constants";
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
        setTimeout(
            () => fitView({ padding: FIT_VIEW_PADDING }),
            REFLOW_DELAY_MS,
        );
    }, [loadDiagram, fitView]);

    const handleAutoLayout = useCallback(() => {
        const { nodes, edges, onNodesChange, normalizeEdgeHandleDirections } =
            useDiagramStore.getState();

        const g = new dagre.graphlib.Graph();
        g.setDefaultEdgeLabel(() => ({}));
        g.setGraph({
            rankdir: "LR",
            nodesep: LAYOUT.DAGRE_NODE_SEP,
            ranksep: LAYOUT.DAGRE_RANK_SEP,
        });

        for (const n of nodes) {
            g.setNode(n.id, {
                width:
                    (n as TableNode & { measured?: { width?: number } })
                        .measured?.width ?? LAYOUT.DEFAULT_NODE_WIDTH,
                height:
                    (n as TableNode & { measured?: { height?: number } })
                        .measured?.height ?? LAYOUT.DEFAULT_NODE_HEIGHT,
            });
        }
        for (const e of edges) g.setEdge(e.source, e.target);

        dagre.layout(g);

        const changes = nodes.map((n) => {
            const { x, y, width, height } = g.node(n.id);
            return {
                id: n.id,
                type: "position" as const,
                position: { x: x - width / 2, y: y - height / 2 },
            };
        });

        onNodesChange(changes);
        normalizeEdgeHandleDirections();
        setTimeout(
            () => fitView({ padding: FIT_VIEW_PADDING }),
            REFLOW_DELAY_MS,
        );
    }, [fitView]);

    return { isPending, handleSave, handleLoadExample, handleAutoLayout };
}
