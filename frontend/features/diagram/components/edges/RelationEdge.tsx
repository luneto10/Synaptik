"use client";

import { memo, useCallback, useMemo, useState, type CSSProperties } from "react";
import {
    getSmoothStepPath,
    EdgeLabelRenderer,
    BaseEdge,
    useViewport,
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
import { useEdgeOffset } from "../../store/edgeLayout";
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

const EDGE_STYLES: Record<"default" | "selected", CSSProperties> = {
    default: {
        stroke: DIAGRAM_COLORS.edge,
        strokeWidth: EDGE_STYLE.strokeWidth,
    },
    selected: {
        stroke: DIAGRAM_COLORS.edgeSelected,
        strokeWidth: EDGE_STYLE.strokeWidthSelected,
    },
};

const LABEL_BUTTON_STYLE: CSSProperties = {
    display: "flex",
    padding: 0,
    margin: 0,
    border: "none",
    background: "none",
    lineHeight: 0,
    cursor: "inherit",
};

const LABEL_WRAPPER_BASE: CSSProperties = {
    position: "absolute",
    transformOrigin: "center",
    pointerEvents: "all",
    display: "flex",
};

function RelationEdge({
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
    const edgeOffset = useEdgeOffset(id);

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
    const { zoom } = useViewport();
    const safeZoom = Math.max(zoom, 0.05);
    // Partial inverse scaling: badges get a readability boost when zoomed out
    // without becoming screen-constant (too large at extreme zoom-out).
    const labelScale = safeZoom < 1 ? 1 / Math.sqrt(safeZoom) : 1;

    const labelWrapperStyle = useMemo<CSSProperties>(
        () => ({
            ...LABEL_WRAPPER_BASE,
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(${labelScale})`,
        }),
        [labelX, labelY, labelScale],
    );

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                style={selected ? EDGE_STYLES.selected : EDGE_STYLES.default}
                markerStart={markerStart}
                markerEnd={markerEnd}
            />

            <EdgeLabelRenderer>
                <div style={labelWrapperStyle} className="nodrag nopan">
                    <Popover
                        open={open}
                        onOpenChange={(v) => {
                            setOpen(v);
                            if (!v) setAskJunction(false);
                        }}
                    >
                        <PopoverTrigger asChild>
                            <button type="button" style={LABEL_BUTTON_STYLE}>
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

export default memo(RelationEdge);
