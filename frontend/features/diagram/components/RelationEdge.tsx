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
import type {
    RelationEdge as RelationEdgeType,
    RelationEdgeData,
    RelationshipType,
} from "../types/flow.types";
import { useDiagramStore } from "../store/diagramStore";
import { RELATION_LABELS } from "../constants";

// ── SVG marker defs (rendered once, injected into FlowCanvas via <EdgeMarkerDefs />) ───

export function EdgeMarkerDefs() {
    return (
        <svg
            style={{
                position: "absolute",
                width: 0,
                height: 0,
                overflow: "hidden",
            }}
        >
            <defs>
                {/* ── Simple filled arrow tip ── */}
                <marker
                    id="me-arrow"
                    orient="auto"
                    refX="8"
                    refY="4"
                    markerWidth="10"
                    markerHeight="8"
                >
                    <path d="M0,0 L0,8 L8,4 Z" fill="#6366f1" />
                </marker>

                {/* ── Simple filled arrow tip ── */}
                <marker
                    id="ms-arrow"
                    orient="auto-start-reverse"
                    refX="8"
                    refY="4"
                    markerWidth="10"
                    markerHeight="8"
                >
                    <path d="M0,0 L0,8 L8,4 Z" fill="#6366f1" />
                </marker>

                {/* ── Vertical bar "one" side ── */}
                <marker
                    id="me-bar"
                    orient="auto"
                    refX="2"
                    refY="5"
                    markerWidth="6"
                    markerHeight="10"
                >
                    <line
                        x1="2"
                        y1="0"
                        x2="2"
                        y2="10"
                        stroke="#6366f1"
                        strokeWidth="2"
                    />
                </marker>

                {/* ── Vertical bar "one" side (markerStart) ── */}
                <marker
                    id="ms-bar"
                    orient="auto-start-reverse"
                    refX="2"
                    refY="5"
                    markerWidth="6"
                    markerHeight="10"
                >
                    <line
                        x1="2"
                        y1="0"
                        x2="2"
                        y2="10"
                        stroke="#6366f1"
                        strokeWidth="2"
                    />
                </marker>
            </defs>
        </svg>
    );
}

// ── Marker pairs [markerStart, markerEnd] per relationship type ───────────────
// 1:1 → bar ─────── bar
// 1:N → bar ─────── ▶   (arrow points into the "many" table)
// N:M → ▶ ────────── ▶  (arrows on both ends for a direct M:M edge)

const MARKERS: Record<RelationshipType, [string, string]> = {
    "one-to-one":   ["url(#ms-bar)",   "url(#me-bar)"],
    "one-to-many":  ["url(#ms-bar)",   "url(#me-arrow)"],
    "many-to-many": ["url(#ms-arrow)", "url(#me-arrow)"],
};

// ── Edge component ────────────────────────────────────────────────────────────

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
    data,
    selected = false,
}: EdgeProps<RelationEdgeType>) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const setEdgeRelationType = useDiagramStore((s) => s.setEdgeRelationType);
    const deleteEdge = useDiagramStore((s) => s.deleteEdge);
    const createJunctionTable = useDiagramStore((s) => s.createJunctionTable);
    const [open, setOpen] = useState(false);
    // When the user picks N:M we show a secondary prompt before committing
    const [askJunction, setAskJunction] = useState(false);

    const relType: RelationshipType =
        (data as RelationEdgeData | undefined)?.relationshipType ??
        "one-to-many";

    const [markerStart, markerEnd] = MARKERS[relType];
    const color = selected ? "#818cf8" : "#6366f1";

    const handleTypeChange = useCallback(
        (val: string) => {
            if (!val) return;
            if (val === "many-to-many" && relType !== "many-to-many") {
                // Show the junction-table prompt before changing
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
                                    className={`
                                        text-[10px] font-mono px-1.5 py-0 h-5 cursor-pointer
                                        hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors select-none
                                        ${selected ? "bg-indigo-500 text-white hover:bg-indigo-600 hover:text-white" : ""}
                                    `}
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
                                /* ── N:M junction prompt ── */
                                <div className="space-y-2 w-48">
                                    <p className="text-xs font-medium">
                                        Create junction table?
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        A junction table lets you store extra
                                        data on the relationship.
                                    </p>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            className="flex-1 h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                            onClick={handleCreateJunction}
                                        >
                                            Create table
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs"
                                            onClick={handleKeepDirect}
                                        >
                                            Direct edge
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-6 text-[10px] text-muted-foreground"
                                        onClick={() => setAskJunction(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                /* ── Normal type picker ── */
                                <>
                                    <p className="text-xs text-muted-foreground font-medium px-1">
                                        Relationship type
                                    </p>
                                    <ToggleGroup
                                        type="single"
                                        value={relType}
                                        onValueChange={handleTypeChange}
                                        className="gap-1"
                                    >
                                        {(Object.keys(RELATION_LABELS) as RelationshipType[]).map((v) => (
                                            <ToggleGroupItem
                                                key={v}
                                                value={v}
                                                className="text-xs h-7 px-2 font-mono data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400"
                                            >
                                                {RELATION_LABELS[v]}
                                            </ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                        onClick={() => {
                                            deleteEdge(id);
                                            setOpen(false);
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Delete relation
                                    </Button>
                                </>
                            )}
                        </PopoverContent>
                    </Popover>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
