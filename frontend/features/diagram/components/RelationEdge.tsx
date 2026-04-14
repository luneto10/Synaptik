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

// ── SVG marker defs (rendered once via FlowCanvas) ───────────────────────────

export function EdgeMarkerDefs() {
    return (
        <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
            <defs>
                {/* ── One (single vertical bar) ── */}
                <marker id="edge-one" markerWidth="6" markerHeight="12" refX="5" refY="6" orient="auto">
                    <line x1="5" y1="0" x2="5" y2="12" stroke="#6366f1" strokeWidth="2" />
                </marker>

                {/* ── Many (crow's foot) ── */}
                <marker id="edge-many" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                    <path d="M10,0 L2,6 L10,12" fill="none" stroke="#6366f1" strokeWidth="1.8" />
                    <line x1="10" y1="0" x2="10" y2="12" stroke="#6366f1" strokeWidth="1.8" />
                </marker>

                {/* ── One-only start (double bar = exactly one) ── */}
                <marker id="edge-one-only" markerWidth="8" markerHeight="12" refX="6" refY="6" orient="auto-start-reverse">
                    <line x1="4" y1="0" x2="4" y2="12" stroke="#6366f1" strokeWidth="2" />
                    <line x1="7" y1="0" x2="7" y2="12" stroke="#6366f1" strokeWidth="2" />
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

// ── Marker IDs per relationship end ──────────────────────────────────────────
const MARKERS: Record<string, [string, string]> = {
    "one-to-one":   ["url(#edge-one-only)", "url(#edge-one-only)"],
    "one-to-many":  ["url(#edge-one-only)", "url(#edge-many)"],
    "many-to-many": ["url(#edge-many)",     "url(#edge-many)"],
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
                    strokeDasharray: relType === "many-to-many" ? "6 3" : undefined,
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
