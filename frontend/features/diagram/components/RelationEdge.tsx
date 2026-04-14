"use client";

import { useState, useCallback } from "react";
import {
    getBezierPath,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { RelationEdge as RelationEdgeType, RelationEdgeData } from "../types/flow.types";
import { useDiagramStore } from "../store/diagramStore";

// ── SVG marker defs (rendered once, injected into FlowCanvas via <EdgeMarkerDefs />) ───

export function EdgeMarkerDefs() {
    return (
        <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
            <defs>
                {/*
                 * Naming convention:
                 *   me-*  → markerEnd  (orient="auto",               tip points toward target)
                 *   ms-*  → markerStart (orient="auto-start-reverse", tip points toward source)
                 *
                 * Shapes drawn left-to-right; at refX the line "arrives".
                 */}

                {/* ── ONE: single vertical bar ── */}
                <marker id="me-one" orient="auto" refX="9" refY="5" markerWidth="12" markerHeight="10">
                    <line x1="9" y1="0" x2="9" y2="10" stroke="#6366f1" strokeWidth="2" />
                </marker>
                <marker id="ms-one" orient="auto-start-reverse" refX="9" refY="5" markerWidth="12" markerHeight="10">
                    <line x1="9" y1="0" x2="9" y2="10" stroke="#6366f1" strokeWidth="2" />
                </marker>

                {/* ── MANY: crow's foot (three prongs) ── */}
                {/*
                 * The path "arrives" from the right at x=10.
                 * Three lines fan out to the left: top-left, straight-left, bottom-left.
                 */}
                <marker id="me-many" orient="auto" refX="10" refY="6" markerWidth="14" markerHeight="12">
                    <line x1="10" y1="0" x2="3" y2="6"  stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="10" y1="6" x2="3" y2="6"  stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="10" y1="12" x2="3" y2="6" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
                    {/* vertical stop bar */}
                    <line x1="10" y1="0" x2="10" y2="12" stroke="#6366f1" strokeWidth="1.8" />
                </marker>
                <marker id="ms-many" orient="auto-start-reverse" refX="10" refY="6" markerWidth="14" markerHeight="12">
                    <line x1="10" y1="0" x2="3" y2="6"  stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="10" y1="6" x2="3" y2="6"  stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="10" y1="12" x2="3" y2="6" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="10" y1="0" x2="10" y2="12" stroke="#6366f1" strokeWidth="1.8" />
                </marker>
            </defs>
        </svg>
    );
}

// ── Label map ────────────────────────────────────────────────────────────────

const LABEL: Record<string, string> = {
    "one-to-one":   "1 : 1",
    "one-to-many":  "1 : N",
    "many-to-many": "N : M",
};

// ── Marker pairs per relationship type ───────────────────────────────────────

const MARKERS: Record<string, [string, string]> = {
    "one-to-one":   ["url(#ms-one)",  "url(#me-one)"],
    "one-to-many":  ["url(#ms-one)",  "url(#me-many)"],
    "many-to-many": ["url(#ms-many)", "url(#me-many)"],
};

// ── Edge component ────────────────────────────────────────────────────────────

export default function RelationEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected = false,
}: EdgeProps<RelationEdgeType>) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
    });

    const setEdgeRelationType = useDiagramStore((s) => s.setEdgeRelationType);
    const deleteEdge = useDiagramStore((s) => s.deleteEdge);
    const [open, setOpen] = useState(false);

    const relType: RelationEdgeData["relationshipType"] =
        (data as RelationEdgeData | undefined)?.relationshipType ?? "one-to-many";

    const [markerStart, markerEnd] = MARKERS[relType];
    const color = selected ? "#818cf8" : "#6366f1";

    const handleTypeChange = useCallback(
        (val: string) => {
            if (!val) return;
            setEdgeRelationType(id, val as RelationEdgeData["relationshipType"]);
            setOpen(false);
        },
        [id, setEdgeRelationType],
    );

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    stroke: color,
                    strokeWidth: selected ? 2.5 : 1.8,
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
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <button>
                                <Badge
                                    variant={selected ? "default" : "secondary"}
                                    className={`
                                        text-[10px] font-mono px-1.5 py-0 h-5 cursor-pointer
                                        hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors select-none
                                        ${selected ? "bg-indigo-500 text-white hover:bg-indigo-600 hover:text-white" : ""}
                                    `}
                                >
                                    {LABEL[relType]}
                                </Badge>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 space-y-2" align="center">
                            <p className="text-xs text-muted-foreground font-medium px-1">
                                Relationship type
                            </p>
                            <ToggleGroup
                                type="single"
                                value={relType}
                                onValueChange={handleTypeChange}
                                className="gap-1"
                            >
                                {(["one-to-one", "one-to-many", "many-to-many"] as const).map((v) => (
                                    <ToggleGroupItem
                                        key={v}
                                        value={v}
                                        className="text-xs h-7 px-2 font-mono data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400"
                                    >
                                        {LABEL[v]}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                onClick={() => { deleteEdge(id); setOpen(false); }}
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete relation
                            </Button>
                        </PopoverContent>
                    </Popover>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
