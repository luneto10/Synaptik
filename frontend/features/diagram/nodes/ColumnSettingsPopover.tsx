"use client";

import { Button } from "@/components/ui/button";
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
import { Settings2 } from "lucide-react";
import type { DbColumn } from "../types/db.types";
import type { TableNode } from "../types/flow.types";
import { useDiagramStore } from "../store/diagramStore";
import { useMemo } from "react";

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

    const otherNodes = useMemo(
        () => nodes.filter((n): n is TableNode => n.id !== nodeId),
        [nodes, nodeId],
    );

    const refNode = otherNodes.find((n) => n.id === column.references?.tableId);

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

                {/* FK reference pickers */}
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
                                onValueChange={(tableId) =>
                                    onUpdate({
                                        ...column,
                                        references: {
                                            tableId,
                                            columnId: column.references?.columnId ?? "",
                                        },
                                    })
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

                        {refNode && (
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Column
                                </Label>
                                <Select
                                    value={column.references?.columnId ?? ""}
                                    onValueChange={(columnId) =>
                                        onUpdate({
                                            ...column,
                                            references: {
                                                tableId: column.references?.tableId ?? "",
                                                columnId,
                                            },
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Select column…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {refNode.data.columns.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={c.id}
                                                className="text-xs font-mono"
                                            >
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
