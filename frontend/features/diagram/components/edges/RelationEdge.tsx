"use client";

import { useState, useCallback, useMemo } from "react";
import {
    getSmoothStepPath,
    EdgeLabelRenderer,
    BaseEdge,
    type EdgeProps,
} from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type {
    RelationEdge as RelationEdgeType,
    RelationEdgeData,
    RelationshipType,
} from "../../types/flow.types";
import { useDiagramStore } from "../../store/diagramStore";
import { RELATION_LABELS, DIAGRAM_COLORS, EDGE_STYLE } from "../../constants";
import { cn } from "@/lib/utils";
import { JunctionPrompt } from "./JunctionPrompt";
import { EdgePopoverContent } from "./EdgePopoverContent";

// ── Marker pairs [markerStart, markerEnd] per relationship type ───────────────
// 1:1 → bar ─── bar    1:N → bar ─── ▶    N:M → ▶ ─── ▶

const MARKERS: Record<RelationshipType, [string, string]> = {
    "one-to-one": ["url(#ms-bar)", "url(#me-bar)"],
    "one-to-many": ["url(#ms-bar)", "url(#me-arrow)"],
    "many-to-many": ["url(#ms-arrow)", "url(#me-arrow)"],
};

function edgeDirection(sourceX: number, targetX: number) {
    return sourceX <= targetX ? "right" : "left";
}

export default function RelationEdge({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
    targetHandleId,
    data,
    selected = false,
}: EdgeProps<RelationEdgeType>) {
    const nodes = useDiagramStore((s) => s.nodes);
    const edges = useDiagramStore((s) => s.edges);

    const edgeOffset = useMemo(() => {
        const byId = new Map(nodes.map((n) => [n.id, n]));
        const sourceNode = byId.get(source);
        const targetNode = byId.get(target);
        if (!sourceNode || !targetNode) return EDGE_STYLE.baseOffset;

        const currentDirection = edgeDirection(sourceX, targetX);

        const siblings = edges
            .filter((e) => e.source === source && e.id !== id)
            .map((e) => {
                const s = byId.get(e.source);
                const t = byId.get(e.target);
                if (!s || !t) return null;
                return {
                    id: e.id,
                    targetY: t.position.y,
                    direction: edgeDirection(s.position.x, t.position.x),
                };
            })
            .filter(
                (
                    entry,
                ): entry is {
                    id: string;
                    targetY: number;
                    direction: "left" | "right";
                } => entry !== null && entry.direction === currentDirection,
            );

        const currentTargetY = targetNode.position.y;
        const sortedTargets = [
            ...siblings.map((s) => ({ id: s.id, y: s.targetY })),
            { id, y: currentTargetY },
        ].sort((a, b) => a.y - b.y);
        const idx = sortedTargets.findIndex((entry) => entry.id === id);
        const centeredLane = idx - (sortedTargets.length - 1) / 2;
        const lanePenalty = Math.abs(centeredLane) * EDGE_STYLE.laneStep;

        const xMin = Math.min(sourceX, targetX);
        const xMax = Math.max(sourceX, targetX);
        const yMid = (sourceY + targetY) / 2;
        const obstacleCount = nodes.filter((n) => {
            if (n.id === source || n.id === target) return false;
            const width = n.measured?.width ?? 280;
            const height = n.measured?.height ?? 200;
            const overlapsX =
                n.position.x <= xMax && n.position.x + width >= xMin;
            const overlapsY =
                yMid >= n.position.y - EDGE_STYLE.obstacleYPadding &&
                yMid <= n.position.y + height + EDGE_STYLE.obstacleYPadding;
            return overlapsX && overlapsY;
        }).length;

        return (
            EDGE_STYLE.baseOffset +
            lanePenalty +
            obstacleCount * EDGE_STYLE.obstacleStep
        );
    }, [nodes, edges, id, source, target, sourceX, sourceY, targetX, targetY]);

    const [edgePath, labelX, labelY] = useMemo(
        () =>
            getSmoothStepPath({
                sourceX,
                sourceY,
                sourcePosition,
                targetX,
                targetY,
                targetPosition,
                borderRadius: EDGE_STYLE.borderRadius,
                offset: edgeOffset,
            }),
        [
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            edgeOffset,
        ],
    );

    const setEdgeRelationType = useDiagramStore((s) => s.setEdgeRelationType);
    const deleteEdge = useDiagramStore((s) => s.deleteEdge);
    const createJunctionTable = useDiagramStore((s) => s.createJunctionTable);
    const flipEdgeEnd = useDiagramStore((s) => s.flipEdgeEnd);

    const [open, setOpen] = useState(false);
    const [askJunction, setAskJunction] = useState(false);

    const relType: RelationshipType =
        (data as RelationEdgeData | undefined)?.relationshipType ??
        "one-to-many";

    const handleTypeChange = useCallback(
        (val: string) => {
            if (!val) return;
            if (val === "many-to-many" && relType !== "many-to-many") {
                setAskJunction(true);
                return;
            }
            setEdgeRelationType(id, val as RelationshipType);
            setOpen(false);
        },
        [id, relType, setEdgeRelationType],
    );

    const handleCreateJunction = useCallback(() => {
        createJunctionTable(source, target);
        deleteEdge(id);
        setAskJunction(false);
        setOpen(false);
    }, [source, target, id, createJunctionTable, deleteEdge]);

    const handleKeepDirect = useCallback(() => {
        setEdgeRelationType(id, "many-to-many");
        setAskJunction(false);
        setOpen(false);
    }, [id, setEdgeRelationType]);

    const handleDelete = useCallback(() => {
        deleteEdge(id);
        setOpen(false);
    }, [id, deleteEdge]);

    const [markerStart, markerEnd] = MARKERS[relType];
    const color = selected ? DIAGRAM_COLORS.edgeSelected : DIAGRAM_COLORS.edge;

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    stroke: color,
                    strokeWidth: selected
                        ? EDGE_STYLE.strokeWidthSelected
                        : EDGE_STYLE.strokeWidth,
                }}
                markerStart={markerStart}
                markerEnd={markerEnd}
            />

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: "absolute",
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: "all",
                    }}
                    className="nodrag nopan"
                >
                    <Popover
                        open={open}
                        onOpenChange={(v) => {
                            setOpen(v);
                            if (!v) setAskJunction(false);
                        }}
                    >
                        <PopoverTrigger asChild>
                            <button>
                                <Badge
                                    variant={selected ? "default" : "secondary"}
                                    className={cn(
                                        "text-[10px] font-mono px-1.5 py-0 h-5 cursor-pointer",
                                        "hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors select-none",
                                        selected &&
                                            "bg-indigo-500 text-white hover:bg-indigo-600 hover:text-white",
                                    )}
                                >
                                    {RELATION_LABELS[relType]}
                                </Badge>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto p-2 space-y-2"
                            align="center"
                        >
                            {askJunction ? (
                                <JunctionPrompt
                                    onCreateJunction={handleCreateJunction}
                                    onKeepDirect={handleKeepDirect}
                                    onCancel={() => setAskJunction(false)}
                                />
                            ) : (
                                <EdgePopoverContent
                                    relType={relType}
                                    hasJunction={
                                        !!(data as RelationEdgeData | undefined)
                                            ?.junctionTableId
                                    }
                                    sourceHandleId={sourceHandleId}
                                    targetHandleId={targetHandleId}
                                    onTypeChange={handleTypeChange}
                                    onFlipSource={() =>
                                        flipEdgeEnd(id, "source")
                                    }
                                    onFlipTarget={() =>
                                        flipEdgeEnd(id, "target")
                                    }
                                    onDelete={handleDelete}
                                    onCreateJunction={handleCreateJunction}
                                />
                            )}
                        </PopoverContent>
                    </Popover>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
