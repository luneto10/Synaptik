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
                width: n.measured?.width ?? LAYOUT.DEFAULT_NODE_WIDTH,
                height: n.measured?.height ?? LAYOUT.DEFAULT_NODE_HEIGHT,
            });
        }
        for (const e of edges) g.setEdge(e.source, e.target);

        dagre.layout(g);

        // Build positions from dagre output (top-left origin).
        const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
        for (const n of nodes) {
            const { x, y, width, height } = g.node(n.id);
            positions.set(n.id, { x: x - width / 2, y: y - height / 2, w: width, h: height });
        }

        // ── Post-process 1: fix junction-table edge crossings ────────────────
        // Dagre (LR) centres a junction between its two parents in Y, so edges
        // from T1 (above J) and T2 (below J) cross in smooth-step routing.
        // Fix: push J below both parents so all edges converge from the same side.
        const junctionParents = new Map<string, Set<string>>();
        for (const e of edges) {
            const jId = e.data?.junctionTableId;
            if (jId) {
                if (!junctionParents.has(jId)) junctionParents.set(jId, new Set());
                junctionParents.get(jId)!.add(e.source);
            }
        }

        for (const [jId, parentIds] of junctionParents) {
            if (parentIds.size < 2) continue;
            const jPos = positions.get(jId);
            if (!jPos) continue;

            let minParentY = Infinity;
            let maxParentBottom = -Infinity;
            for (const pId of parentIds) {
                const p = positions.get(pId);
                if (!p) continue;
                minParentY = Math.min(minParentY, p.y);
                maxParentBottom = Math.max(maxParentBottom, p.y + p.h);
            }

            const jCenterY = jPos.y + jPos.h / 2;
            if (jCenterY > minParentY && jCenterY < maxParentBottom) {
                positions.set(jId, { ...jPos, y: maxParentBottom + LAYOUT.DAGRE_NODE_SEP });
            }
        }

        // ── Post-process 2: balance crowded left columns ──────────────────────
        // When many source tables all point to the same target from the left, the
        // left column becomes a tall stack and arrows pile up on one side.
        // Move the lower half of those sources to the RIGHT of the target so edges
        // arrive from both sides — creating a balanced, readable layout.
        const BALANCE_THRESHOLD = 3;
        const sourcesByTarget = new Map<string, string[]>();
        for (const e of edges) {
            if (!sourcesByTarget.has(e.target)) sourcesByTarget.set(e.target, []);
            sourcesByTarget.get(e.target)!.push(e.source);
        }

        for (const [targetId, sourceIds] of sourcesByTarget) {
            const targetPos = positions.get(targetId);
            if (!targetPos) continue;

            // Only consider sources that dagre placed to the LEFT of the target.
            const leftSources = [...new Set(sourceIds)].filter(
                (id) => (positions.get(id)?.x ?? 0) < targetPos.x,
            );
            if (leftSources.length <= BALANCE_THRESHOLD) continue;

            // Sort by Y and migrate the bottom half to the right side.
            leftSources.sort((a, b) => (positions.get(a)?.y ?? 0) - (positions.get(b)?.y ?? 0));
            const rightCandidates = leftSources.slice(Math.ceil(leftSources.length / 2));

            const rightX = targetPos.x + targetPos.w + LAYOUT.GAP_X;
            let rightY = targetPos.y;
            for (const id of rightCandidates) {
                const p = positions.get(id)!;
                positions.set(id, { ...p, x: rightX, y: rightY });
                rightY += p.h + LAYOUT.DAGRE_NODE_SEP;
            }
        }

        const changes = nodes.map((n) => {
            const p = positions.get(n.id)!;
            return { id: n.id, type: "position" as const, position: { x: p.x, y: p.y } };
        });

        onNodesChange(changes);
        normalizeEdgeHandleDirections();
        setTimeout(() => fitView({ padding: FIT_VIEW_PADDING }), REFLOW_DELAY_MS);
    }, [fitView]);

    return { isPending, handleSave, handleLoadExample, handleAutoLayout };
}
