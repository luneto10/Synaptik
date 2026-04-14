"use client";

import { useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import type { DbColumn, ColumnType } from "../types/db.types";
import { useDiagramStore } from "../store/diagramStore";
import ColumnBadges from "./ColumnBadges";
import ColumnSettingsPopover from "./ColumnSettingsPopover";

const COLUMN_TYPES: ColumnType[] = [
    "uuid",
    "text",
    "varchar",
    "int",
    "bigint",
    "boolean",
    "timestamp",
    "jsonb",
    "float",
];

interface Props {
    nodeId: string;
    column: DbColumn;
    onUpdate: (column: DbColumn) => void;
    onRemove: () => void;
}

export default function TableNodeColumnRow({
    nodeId,
    column,
    onUpdate,
    onRemove,
}: Props) {
    const nodes = useDiagramStore((s) => s.nodes);
    const otherNodes = useMemo(
        () => nodes.filter((n) => n.id !== nodeId),
        [nodes, nodeId],
    );

    return (
        <div className="group relative flex items-center border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
            {/* ── Target handle (left) — faint by default, full on hover ── */}
            <Handle
                type="target"
                position={Position.Left}
                id={`${column.id}-target`}
                className="w-2.5! h-2.5! bg-indigo-500! border-2! border-card! rounded-full! opacity-20! group-hover:!opacity-100! transition-opacity! cursor-crosshair!"
                style={{ top: "50%" }}
            />

            {/* Badges */}
            <div className="w-10 px-2 shrink-0">
                <ColumnBadges column={column} />
            </div>

            {/* Name */}
            <div className="flex-1 px-1 py-1.5 min-w-0">
                <Input
                    value={column.name}
                    onChange={(e) =>
                        onUpdate({ ...column, name: e.target.value })
                    }
                    className="h-7 text-sm border-0 bg-transparent shadow-none p-0 font-mono text-foreground
                               focus-visible:ring-0 focus-visible:ring-offset-0
                               focus-visible:bg-indigo-500/10 focus-visible:rounded focus-visible:px-1
                               w-full"
                />
            </div>

            {/* Type */}
            <div className="w-24 px-1 py-1.5 shrink-0 flex items-center justify-center">
                <Select
                    value={column.type}
                    onValueChange={(v) =>
                        onUpdate({ ...column, type: v as ColumnType })
                    }
                >
                    <SelectTrigger className="h-7 text-sm border-0 bg-transparent shadow-none p-0 focus:ring-0 focus:ring-offset-0 text-muted-foreground gap-1 w-full [&>svg]:opacity-50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {COLUMN_TYPES.map((t) => (
                            <SelectItem
                                key={t}
                                value={t}
                                className="text-sm font-mono"
                            >
                                {t}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Actions */}
            <div className="w-14 px-1 shrink-0">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ColumnSettingsPopover
                        column={column}
                        otherNodes={otherNodes}
                        onUpdate={onUpdate}
                    />
                    {!column.isPrimaryKey && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onRemove}
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                Delete column
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* ── Source handle (right) — faint by default, full on hover ── */}
            <Handle
                type="source"
                position={Position.Right}
                id={`${column.id}-source`}
                className="w-2.5! h-2.5! bg-indigo-500! border-2! border-card! rounded-full! opacity-20! group-hover:!opacity-100! transition-opacity! cursor-crosshair!"
                style={{ top: "50%" }}
            />
        </div>
    );
}
