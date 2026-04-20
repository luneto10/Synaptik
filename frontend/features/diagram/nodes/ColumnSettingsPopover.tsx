"use client";

import { useState, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Settings2, KeyRound } from "lucide-react";
import type { DbColumn } from "../types/db.types";
import type { TableNode, RelationEdge } from "../types/flow.types";
import { isTableNode } from "../types/flow.types";
import { useDiagramStore } from "../store/diagramStore";
import { SidePicker } from "../components/SidePicker";
import { getHandleSide } from "../utils/handleIds";

// ── Snapshot (read once on open — zero subscriptions during drag) ─────────────

type Snapshot = {
    otherNodes: TableNode[];
    connectedEdge: RelationEdge | undefined;
    currentSide: "left" | "right" | null;
};

const EMPTY_SNAPSHOT: Snapshot = {
    otherNodes: [],
    connectedEdge: undefined,
    currentSide: null,
};

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
    const [open, setOpen] = useState(false);
    const [snap, setSnap] = useState<Snapshot>(EMPTY_SNAPSHOT);

    // Only stable action selectors — these never change and do not cause re-renders on drag
    const flipColumnHandleSide = useDiagramStore((s) => s.flipColumnHandleSide);
    const retargetFkColumn = useDiagramStore((s) => s.retargetFkColumn);
    const deleteEdgeOnly = useDiagramStore((s) => s.deleteEdgeOnly);

    const readSnapshot = useCallback((): Snapshot => {
        const { nodes, edges } = useDiagramStore.getState();
        const otherNodes = nodes.filter(
            (n): n is TableNode => n.id !== nodeId && isTableNode(n),
        );
        // Find edge by column data IDs (works with node-level handles)
        const connectedEdge = edges.find(
            (e) =>
                (e.source === nodeId && e.data?.sourceColumnId === column.id) ||
                (e.target === nodeId && e.data?.targetColumnId === column.id),
        );
        let currentSide: "left" | "right" | null = null;
        if (connectedEdge) {
            currentSide =
                connectedEdge.source === nodeId
                    ? getHandleSide(connectedEdge.sourceHandle)
                    : getHandleSide(connectedEdge.targetHandle);
        }
        return { otherNodes, connectedEdge, currentSide };
    }, [nodeId, column.id]);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) setSnap(readSnapshot());
    };

    // Intercept FK toggle-off: delete the FK edge (without cascading column removal)
    const handleUpdate = useCallback(
        (updated: DbColumn) => {
            if (column.isForeignKey && !updated.isForeignKey) {
                const { edges } = useDiagramStore.getState();
                const edge = edges.find(
                    (e) => e.target === nodeId && e.data?.targetColumnId === column.id,
                );
                if (edge) deleteEdgeOnly(edge.id);
            }
            onUpdate(updated);
        },
        [column.isForeignKey, column.id, nodeId, deleteEdgeOnly, onUpdate],
    );

    // After each action, refresh the snapshot so the UI reflects the change immediately
    const handleFlipSide = () => {
        flipColumnHandleSide(nodeId, column.id);
        setSnap(readSnapshot());
    };

    const handleRetarget = (nId: string, colId: string, tableId: string) => {
        retargetFkColumn(nId, colId, tableId);
        setSnap(readSnapshot());
    };

    const refPk = snap.otherNodes
        .find((n) => n.id === column.references?.tableId)
        ?.data.columns.find((c) => c.isPrimaryKey);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
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
                <TooltipContent side="top" data-node-tooltip="">
                    Column settings
                </TooltipContent>
            </Tooltip>

            <PopoverContent className="w-64 p-3 space-y-3" side="right">
                <p className="text-xs font-semibold">
                    Column:{" "}
                    <span className="font-mono text-indigo-400">
                        {column.name}
                    </span>
                </p>

                <Separator />

                <ColumnFlagToggles column={column} onUpdate={handleUpdate} />

                {snap.currentSide !== null && (
                    <div className="space-y-1.5 pt-1 border-t border-border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                            Arrow side
                        </p>
                        <SidePicker
                            label=""
                            side={snap.currentSide}
                            onFlip={handleFlipSide}
                        />
                    </div>
                )}

                {column.isForeignKey && (
                    <FkReferenceSection
                        column={column}
                        nodeId={nodeId}
                        otherNodes={snap.otherNodes}
                        refPk={refPk}
                        onRetarget={handleRetarget}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
}

// ── Column flag toggles (PK / Unique / Nullable / FK) ─────────────────────────

function ColumnFlagToggles({
    column,
    onUpdate,
}: {
    column: DbColumn;
    onUpdate: (c: DbColumn) => void;
}) {
    return (
        <>
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
        </>
    );
}

// ── FK reference section (table picker + read-only PK badge) ──────────────────

function FkReferenceSection({
    column,
    nodeId,
    otherNodes,
    refPk,
    onRetarget,
}: {
    column: DbColumn;
    nodeId: string;
    otherNodes: TableNode[];
    refPk: DbColumn | undefined;
    onRetarget: (nodeId: string, colId: string, tableId: string) => void;
}) {
    return (
        <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                References
            </p>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Table</Label>
                <Select
                    value={column.references?.tableId ?? ""}
                    onValueChange={(newTableId) =>
                        onRetarget(nodeId, column.id, newTableId)
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
            {refPk && (
                <Badge className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    <KeyRound className="w-3 h-3 text-amber-500 shrink-0" />
                    <div className="font-mono">{refPk.name}</div>
                </Badge>
            )}
        </div>
    );
}

// ── Labeled switch row ────────────────────────────────────────────────────────

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
