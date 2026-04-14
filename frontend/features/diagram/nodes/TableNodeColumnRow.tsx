"use client";

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
import { TableCell, TableRow } from "@/components/ui/table";
import { Trash2, KeyRound, Link, CircleDot } from "lucide-react";
import type { DbColumn, ColumnType } from "../types/db.types";
import { Toggle } from "@/components/ui/toggle";

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

interface TableNodeColumnRowProps {
    column: DbColumn;
    onUpdate: (column: DbColumn) => void;
    onRemove: () => void;
}

export default function TableNodeColumnRow({
    column,
    onUpdate,
    onRemove,
}: TableNodeColumnRowProps) {
    return (
        <TableRow className="group hover:bg-slate-50">
            {/* ── Badges ── */}
            <TableCell className="px-2 py-1 w-10">
                <ColumnBadges column={column} />
            </TableCell>

            {/* ── Name ── */}
            <TableCell className="px-2 py-1">
                <Input
                    value={column.name}
                    onChange={(e) =>
                        onUpdate({ ...column, name: e.target.value })
                    }
                    className="h-6 text-xs border-0 bg-transparent p-0
                         focus-visible:ring-0 focus-visible:ring-offset-0
                         focus-visible:bg-indigo-50 focus-visible:rounded
                         focus-visible:px-1 font-mono"
                />
            </TableCell>

            {/* ── Type ── */}
            <TableCell className="px-2 py-1">
                <Select
                    value={column.type}
                    onValueChange={(v) =>
                        onUpdate({ ...column, type: v as ColumnType })
                    }
                >
                    <SelectTrigger
                        className="h-6 text-xs border-0 bg-transparent p-0
                           focus:ring-0 text-slate-500 gap-1 w-24"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {COLUMN_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                                {t}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>

            {/* ── Nullable ── */}
            <TableCell className="px-2 py-1 w-8 text-center">
                <NullableToggle column={column} onUpdate={onUpdate} />
            </TableCell>

            {/* ── Remove ── */}
            <TableCell className="px-1 py-1 w-6">
                {!column.isPrimaryKey && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="h-5 w-5 opacity-0 group-hover:opacity-100
                           text-slate-300 hover:text-red-500 hover:bg-red-50
                           transition-opacity"
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                )}
            </TableCell>
        </TableRow>
    );
}

function ColumnBadges({ column }: { column: DbColumn }) {
    return (
        <div className="flex gap-0.5">
            {column.isPrimaryKey && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <KeyRound className="w-3 h-3 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent side="top">Primary key</TooltipContent>
                </Tooltip>
            )}
            {column.isForeignKey && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link className="w-3 h-3 text-violet-500" />
                    </TooltipTrigger>
                    <TooltipContent side="top">Foreign key</TooltipContent>
                </Tooltip>
            )}
            {column.isUnique && !column.isPrimaryKey && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <CircleDot className="w-3 h-3 text-sky-400" />
                    </TooltipTrigger>
                    <TooltipContent side="top">Unique</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}

// ── Nullable toggle ───────────────────────────────────────────────────────────

function NullableToggle({
    column,
    onUpdate,
}: {
    column: DbColumn;
    onUpdate: (column: DbColumn) => void;
}) {
    return (
        <Toggle
            size="sm"
            pressed={column.isNullable}
            onPressedChange={(pressed) =>
                onUpdate({ ...column, isNullable: pressed })
            }
            className="h-5 w-5 p-0 text-[10px] font-bold data-[state=on]:bg-emerald-100
                   data-[state=on]:text-emerald-700 data-[state=on]:border-emerald-300
                   border border-slate-200 text-slate-400"
        >
            N
        </Toggle>
    );
}
