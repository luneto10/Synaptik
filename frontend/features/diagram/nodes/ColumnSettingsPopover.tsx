"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
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
import { getDiagramDialect, getDialectType } from "../dialects";

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
    const dialect = useDiagramStore((state) => state.dialect);

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
                const { edges, deleteEdgeOnly } = useDiagramStore.getState();
                const edge = edges.find(
                    (e) => e.target === nodeId && e.data?.targetColumnId === column.id,
                );
                if (edge) deleteEdgeOnly(edge.id);
            }
            onUpdate(updated);
        },
        [column.isForeignKey, column.id, nodeId, onUpdate],
    );

    // After each action, refresh the snapshot so the UI reflects the change immediately
    const handleFlipSide = () => {
        useDiagramStore.getState().flipColumnHandleSide(nodeId, column.id);
        setSnap(readSnapshot());
    };

    const handleRetarget = (nId: string, colId: string, tableId: string) => {
        useDiagramStore.getState().retargetFkColumn(nId, colId, tableId);
        setSnap(readSnapshot());
    };

    const refPk = snap.otherNodes
        .find((n) => n.id === column.references?.tableId)
        ?.data.columns.find((c) => c.isPrimaryKey);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onPointerDown={(event) => event.stopPropagation()}
                    className="nodrag nopan h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Column settings"
                    title="Column settings"
                >
                    <Settings2 className="w-3 h-3" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-64 p-3 space-y-3" side="right">
                <p className="text-xs font-semibold">
                    Column:{" "}
                    <span className="font-mono text-indigo-400">
                        {column.name}
                    </span>
                </p>

                <Separator />

                <ColumnFlagToggles column={column} onUpdate={handleUpdate} />

                <ColumnTypeSettingsSection
                    column={column}
                    dialect={dialect}
                    onUpdate={handleUpdate}
                />

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

function ColumnTypeSettingsSection({
    column,
    dialect,
    onUpdate,
}: {
    column: DbColumn;
    dialect: ReturnType<typeof useDiagramStore.getState>["dialect"];
    onUpdate: (c: DbColumn) => void;
}) {
    const typeDef = getDialectType(dialect, column.type);
    const allTypes = getDiagramDialect(dialect).types;

    const updateLength = (value: string) => {
        const parsed = Number.parseInt(value, 10);
        onUpdate({
            ...column,
            typeOptions: Number.isFinite(parsed)
                ? { ...column.typeOptions, length: parsed }
                : column.typeOptions,
        });
    };

    const updatePrecisionScale = (field: "precision" | "scale", value: string) => {
        const parsed = Number.parseInt(value, 10);
        onUpdate({
            ...column,
            typeOptions: Number.isFinite(parsed)
                ? { ...column.typeOptions, [field]: parsed }
                : column.typeOptions,
        });
    };

    return (
        <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Type
            </p>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dialect type</Label>
                <Select
                    value={column.type}
                    onValueChange={(nextType) => {
                        const nextTypeDef = getDialectType(dialect, nextType);
                        onUpdate({
                            ...column,
                            type: nextType,
                            typeOptions: nextTypeDef?.defaultArguments,
                            isAutoIncrement:
                                nextTypeDef?.supportsAutoIncrement === true &&
                                column.isAutoIncrement === true,
                        });
                    }}
                >
                    <SelectTrigger className="h-7 text-xs font-mono">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {allTypes.map((availableType) => (
                            <SelectItem
                                key={availableType.id}
                                value={availableType.id}
                                className="text-xs font-mono"
                            >
                                {availableType.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {typeDef?.argumentKind === "length" && (
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Length</Label>
                    <input
                        type="number"
                        min={1}
                        onPointerDown={(event) => event.stopPropagation()}
                        value={column.typeOptions?.length ?? ""}
                        onChange={(event) => updateLength(event.target.value)}
                        className="nodrag nopan h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs font-mono outline-none"
                    />
                </div>
            )}

            {typeDef?.argumentKind === "precision-scale" && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Precision</Label>
                        <input
                            type="number"
                            min={1}
                            onPointerDown={(event) => event.stopPropagation()}
                            value={column.typeOptions?.precision ?? ""}
                            onChange={(event) =>
                                updatePrecisionScale("precision", event.target.value)
                            }
                            className="nodrag nopan h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs font-mono outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Scale</Label>
                        <input
                            type="number"
                            min={1}
                            onPointerDown={(event) => event.stopPropagation()}
                            value={column.typeOptions?.scale ?? ""}
                            onChange={(event) =>
                                updatePrecisionScale("scale", event.target.value)
                            }
                            className="nodrag nopan h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs font-mono outline-none"
                        />
                    </div>
                </div>
            )}

            {typeDef?.supportsAutoIncrement && (
                <ToggleRow
                    id={`autoincrement-${column.id}`}
                    label="Auto increment"
                    checked={column.isAutoIncrement === true}
                    onCheckedChange={(checked) =>
                        onUpdate({
                            ...column,
                            isAutoIncrement: checked,
                            isNullable: checked ? false : column.isNullable,
                        })
                    }
                />
            )}
        </div>
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
