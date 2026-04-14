"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings2, ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import type { DbColumn } from "../types/db.types";
import type { TableNode } from "../types/flow.types";
import { useDiagramStore } from "../store/diagramStore";

interface ColumnSettingsPopoverProps {
    nodeId: string;
    column: DbColumn;
    onUpdate: (column: DbColumn) => void;
}

export default function ColumnSettingsPopover({
    nodeId,
    column,
    onUpdate,
}: ColumnSettingsPopoverProps) {
    const nodes = useDiagramStore((s) => s.nodes);
    const edges = useDiagramStore((s) => s.edges);
    const flipColumnHandleSide = useDiagramStore((s) => s.flipColumnHandleSide);
    const retargetFkColumn = useDiagramStore((s) => s.retargetFkColumn);

    const otherNodes = useMemo(
        () => nodes.filter((n): n is TableNode => n.id !== nodeId),
        [nodes, nodeId],
    );

    // The edge that connects through this column (as source or target)
    const connectedEdge = useMemo(
        () =>
            edges.find(
                (e) =>
                    (e.source === nodeId &&
                        (e.sourceHandle === `${column.id}-source` ||
                            e.sourceHandle === `${column.id}-source-left`)) ||
                    (e.target === nodeId &&
                        (e.targetHandle === `${column.id}-target` ||
                            e.targetHandle === `${column.id}-target-right`)),
            ),
        [edges, nodeId, column.id],
    );

    // Current handle side for the connected edge
    const currentSide = useMemo(() => {
        if (!connectedEdge) return null;
        if (connectedEdge.source === nodeId) {
            return connectedEdge.sourceHandle === `${column.id}-source-left`
                ? "left"
                : "right";
        }
        return connectedEdge.targetHandle === `${column.id}-target-right`
            ? "right"
            : "left";
    }, [connectedEdge, nodeId, column.id]);

    // The referenced table's PK column (for display only)
    const refNode = otherNodes.find((n) => n.id === column.references?.tableId);
    const refPk = refNode?.data.columns.find((c) => c.isPrimaryKey);

    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                        >
                            <Settings2 className="w-3 h-3" />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Column settings</TooltipContent>
            </Tooltip>

            <PopoverContent className="w-64 p-3 space-y-3" side="right">
                <p className="text-xs font-semibold">
                    Column:{" "}
                    <span className="font-mono text-indigo-400">
                        {column.name}
                    </span>
                </p>

                <Separator />

                <ToggleRow
                    id={`pk-${column.id}`}
                    label="Primary key"
                    checked={column.isPrimaryKey}
                    onCheckedChange={(checked) =>
                        onUpdate({
                            ...column,
                            isPrimaryKey: checked,
                            isUnique: checked ? true : column.isUnique,
                            isNullable: checked ? false : column.isNullable,
                        })
                    }
                />

                <ToggleRow
                    id={`unique-${column.id}`}
                    label="Unique"
                    checked={column.isUnique}
                    disabled={column.isPrimaryKey}
                    onCheckedChange={(checked) =>
                        onUpdate({ ...column, isUnique: checked })
                    }
                />

                <ToggleRow
                    id={`null-${column.id}`}
                    label="Nullable"
                    checked={column.isNullable}
                    disabled={column.isPrimaryKey}
                    onCheckedChange={(checked) =>
                        onUpdate({ ...column, isNullable: checked })
                    }
                />

                <ToggleRow
                    id={`fk-${column.id}`}
                    label="Foreign key"
                    checked={column.isForeignKey}
                    onCheckedChange={(checked) =>
                        onUpdate({
                            ...column,
                            isForeignKey: checked,
                            references: checked ? column.references : undefined,
                        })
                    }
                />

                {/* Arrow side — only shown when an edge is connected */}
                {currentSide !== null && (
                    <div className="space-y-1.5 pt-1 border-t border-border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                            Arrow side
                        </p>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant={
                                    currentSide === "left"
                                        ? "default"
                                        : "outline"
                                }
                                className={`flex-1 h-7 text-xs gap-1 ${currentSide === "left" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                                onClick={() =>
                                    currentSide !== "left" &&
                                    flipColumnHandleSide(nodeId, column.id)
                                }
                            >
                                <ArrowLeft className="w-3 h-3" /> Left
                            </Button>
                            <Button
                                size="sm"
                                variant={
                                    currentSide === "right"
                                        ? "default"
                                        : "outline"
                                }
                                className={`flex-1 h-7 text-xs gap-1 ${currentSide === "right" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                                onClick={() =>
                                    currentSide !== "right" &&
                                    flipColumnHandleSide(nodeId, column.id)
                                }
                            >
                                Right <ArrowRight className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* FK reference — only the table picker; column is always the PK */}
                {column.isForeignKey && (
                    <div className="space-y-2 pt-1 border-t border-border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                            References
                        </p>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                                Table
                            </Label>
                            <Select
                                value={column.references?.tableId ?? ""}
                                onValueChange={(newTableId) =>
                                    retargetFkColumn(
                                        nodeId,
                                        column.id,
                                        newTableId,
                                    )
                                }
                            >
                                <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Select table…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {otherNodes.map((n) => (
                                        <SelectItem
                                            key={n.id}
                                            value={n.id}
                                            className="text-xs font-mono"
                                        >
                                            {n.data.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Show the PK column as read-only info */}
                        {refPk && (
                            <Badge className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                                <KeyRound className="w-3 h-3 text-amber-500 shrink-0" />
                                <div className="font-mono">{refPk.name}</div>
                            </Badge>
                        )}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

// ── Reusable labeled toggle row ───────────────────────────────────────────────

function ToggleRow({
    id,
    label,
    checked,
    disabled,
    onCheckedChange,
}: {
    id: string;
    label: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <Label
                htmlFor={id}
                className="text-xs text-muted-foreground cursor-pointer"
            >
                {label}
            </Label>
            <Switch
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}
